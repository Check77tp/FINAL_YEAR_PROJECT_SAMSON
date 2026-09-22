import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as schedulesRepository from '../repositories/schedules.repository.js';
import { createRequest } from './requests.service.js';
import {
  advanceNextDue,
  shouldGenerate,
  createSchedule,
  runDueSchedules,
  runScheduleNow,
  setScheduleActive,
  FREQUENCY_DAYS,
} from './schedules.service.js';
import { PREVENTIVE_PREFIX } from '../utils/preventive.js';

vi.mock('../repositories/schedules.repository.js');
vi.mock('./requests.service.js', () => ({ createRequest: vi.fn() }));

const NOW = new Date('2026-09-20T12:00:00Z');
const DAY = 86400e3;
const iso = (offsetDays) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

const scheduleRow = (over = {}) => ({
  schedule_id: 1, title: 'Inspect geysers', description: null, category_id: 2, hostel: 'Kalingalinga',
  room: null, priority: 'low', frequency_days: 30, next_due_at: iso(-1), active: true,
  created_by: 'admin-1', created_at: iso(-60), last_generated_at: null, category: { category_id: 2, name: 'Plumbing' },
  ...over,
});

describe('advanceNextDue', () => {
  it('steps forward by the frequency', () => {
    expect(advanceNextDue(iso(-1), 30, NOW).toISOString()).toBe(iso(29));
  });

  it('a long-dormant schedule jumps to the next FUTURE date (no catch-up burst)', () => {
    const next = advanceNextDue(iso(-100), 30, NOW);
    expect(next.getTime()).toBeGreaterThan(NOW.getTime());
    expect(next.getTime() - NOW.getTime()).toBeLessThanOrEqual(30 * DAY);
  });
});

describe('shouldGenerate', () => {
  it('yes when nothing was generated yet, or the last task is finished', () => {
    expect(shouldGenerate(undefined)).toBe(true);
    expect(shouldGenerate({ status: 'closed' })).toBe(true);
    expect(shouldGenerate({ status: 'resolved' })).toBe(true);
  });

  it('no while the previous task is still open, assigned or in progress', () => {
    for (const status of ['open', 'assigned', 'in_progress']) expect(shouldGenerate({ status })).toBe(false);
  });
});

describe('createSchedule validation', () => {
  const valid = { adminId: 'a', title: 'Inspect geysers', categoryId: 2, hostel: 'Kalingalinga', frequencyDays: 30 };

  beforeEach(() => {
    vi.clearAllMocks();
    schedulesRepository.insertSchedule.mockResolvedValue(scheduleRow());
  });

  it('accepts a valid schedule and defaults priority to low', async () => {
    await createSchedule(valid);
    expect(schedulesRepository.insertSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Inspect geysers', priority: 'low', frequencyDays: 30, createdBy: 'a' })
    );
  });

  it.each([
    ['short title', { title: 'ab' }],
    ['no hostel', { hostel: ' ' }],
    ['bad category', { categoryId: 'x' }],
    ['unsupported frequency', { frequencyDays: 13 }],
    ['bad priority', { priority: 'urgent' }],
    ['bad date', { firstDueAt: 'later' }],
  ])('rejects: %s', async (_label, patch) => {
    await expect(createSchedule({ ...valid, ...patch })).rejects.toMatchObject({ statusCode: 400 });
    expect(schedulesRepository.insertSchedule).not.toHaveBeenCalled();
  });

  it('offers the expected frequencies', () => {
    expect(FREQUENCY_DAYS).toEqual([7, 14, 30, 90, 180, 365]);
  });
});

describe('runDueSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    schedulesRepository.findLatestRunPerSchedule.mockResolvedValue(new Map());
    createRequest.mockResolvedValue({ requestId: 500 });
  });

  it('creates a request for a due schedule, tagged as preventive, and advances the due date', async () => {
    schedulesRepository.findDueSchedules.mockResolvedValue([scheduleRow({ room: 'Block C', description: 'Check thermostat' })]);

    expect(await runDueSchedules(NOW)).toBe(1);

    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'admin-1',
        categoryId: 2,
        hostel: 'Kalingalinga',
        room: 'Block C',
        priority: 'low',
        description: `${PREVENTIVE_PREFIX}Inspect geysers - Check thermostat`,
      })
    );
    expect(schedulesRepository.insertRun).toHaveBeenCalledWith({ scheduleId: 1, requestId: 500 });
    const advance = schedulesRepository.updateSchedule.mock.calls.find(([, patch]) => patch.next_due_at);
    expect(new Date(advance[1].next_due_at).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('advances the due date BEFORE creating the request (a failure cannot cause hourly repeats)', async () => {
    schedulesRepository.findDueSchedules.mockResolvedValue([scheduleRow()]);
    const order = [];
    schedulesRepository.updateSchedule.mockImplementation(async (_id, patch) => patch.next_due_at && order.push('advance'));
    createRequest.mockImplementation(async () => {
      order.push('create');
      return { requestId: 1 };
    });
    await runDueSchedules(NOW);
    expect(order).toEqual(['advance', 'create']);
  });

  it('does NOT stack a new task while the previous one is still open, but still advances', async () => {
    schedulesRepository.findDueSchedules.mockResolvedValue([scheduleRow()]);
    schedulesRepository.findLatestRunPerSchedule.mockResolvedValue(new Map([[1, { request_id: 9, status: 'in_progress' }]]));

    expect(await runDueSchedules(NOW)).toBe(0);
    expect(createRequest).not.toHaveBeenCalled();
    expect(schedulesRepository.updateSchedule).toHaveBeenCalled();
  });

  it('one failing schedule does not stop the others', async () => {
    schedulesRepository.findDueSchedules.mockResolvedValue([scheduleRow({ schedule_id: 1 }), scheduleRow({ schedule_id: 2 })]);
    createRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ requestId: 7 });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await runDueSchedules(NOW)).toBe(1);
  });

  it('does nothing when nothing is due', async () => {
    schedulesRepository.findDueSchedules.mockResolvedValue([]);
    expect(await runDueSchedules(NOW)).toBe(0);
  });
});

describe('runScheduleNow and pause/resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    schedulesRepository.findLatestRunPerSchedule.mockResolvedValue(new Map());
    createRequest.mockResolvedValue({ requestId: 501 });
  });

  it('creates the task immediately without touching the schedule rhythm', async () => {
    schedulesRepository.findScheduleById.mockResolvedValue(scheduleRow({ next_due_at: iso(10) }));
    expect(await runScheduleNow({ scheduleId: 1, now: NOW })).toEqual({ scheduleId: 1, requestId: 501 });
    const advanced = schedulesRepository.updateSchedule.mock.calls.some(([, patch]) => patch.next_due_at);
    expect(advanced).toBe(false);
  });

  it('refuses when the previous task is still open (400) and 404s for unknown schedules', async () => {
    schedulesRepository.findScheduleById.mockResolvedValue(scheduleRow());
    schedulesRepository.findLatestRunPerSchedule.mockResolvedValue(new Map([[1, { request_id: 9, status: 'open' }]]));
    await expect(runScheduleNow({ scheduleId: 1 })).rejects.toMatchObject({ statusCode: 400 });
    schedulesRepository.findScheduleById.mockResolvedValue(null);
    await expect(runScheduleNow({ scheduleId: 99 })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('resuming a long-paused schedule moves its due date into the future instead of firing at once', async () => {
    schedulesRepository.findScheduleById.mockResolvedValue(scheduleRow({ active: false, next_due_at: iso(-200) }));
    await setScheduleActive({ scheduleId: 1, active: true });
    const patch = schedulesRepository.updateSchedule.mock.calls[0][1];
    expect(patch.active).toBe(true);
    expect(new Date(patch.next_due_at).getTime()).toBeGreaterThan(Date.now());
  });
});
