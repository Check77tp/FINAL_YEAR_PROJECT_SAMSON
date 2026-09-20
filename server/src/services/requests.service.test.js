// Unit tests for the request lifecycle business rules (CLAUDE.md "Core
// Ticket Lifecycle"). Repositories are mocked so this tests the service
// layer in isolation, per the layered-architecture testing expectations.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidTransition, assignTechnician, updateRequestStatus, createRequest } from './requests.service.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as storageRepository from '../repositories/storage.repository.js';

vi.mock('../repositories/requests.repository.js');
vi.mock('../repositories/users.repository.js');
vi.mock('../repositories/storage.repository.js');
// Notifications are side effects covered by push.service.test.js.
vi.mock('./push.service.js');

describe('isValidTransition', () => {
  it('allows each forward step in the lifecycle', () => {
    expect(isValidTransition('open', 'assigned')).toBe(true);
    expect(isValidTransition('assigned', 'in_progress')).toBe(true);
    expect(isValidTransition('in_progress', 'resolved')).toBe(true);
    expect(isValidTransition('resolved', 'closed')).toBe(true);
  });

  it('rejects skipping a step', () => {
    expect(isValidTransition('open', 'in_progress')).toBe(false);
    expect(isValidTransition('open', 'closed')).toBe(false);
    expect(isValidTransition('assigned', 'resolved')).toBe(false);
  });

  it('rejects moving backward', () => {
    expect(isValidTransition('resolved', 'in_progress')).toBe(false);
    expect(isValidTransition('assigned', 'open')).toBe(false);
  });

  it('rejects a no-op transition to the same status', () => {
    expect(isValidTransition('open', 'open')).toBe(false);
  });

  it('rejects any transition out of closed, the terminal state', () => {
    expect(isValidTransition('closed', 'open')).toBe(false);
    expect(isValidTransition('closed', 'closed')).toBe(false);
  });

  it('rejects unknown status values', () => {
    expect(isValidTransition('open', 'banana')).toBe(false);
    expect(isValidTransition('banana', 'open')).toBe(false);
  });
});

describe('assignTechnician', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 404 if the request does not exist', async () => {
    requestsRepository.findRequestById.mockResolvedValue(null);

    await expect(assignTechnician({ requestId: 1, technicianId: 'tech-1' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects assigning a request that is not open', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'in_progress' });

    await expect(assignTechnician({ requestId: 1, technicianId: 'tech-1' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(requestsRepository.insertTechnicianAssignment).not.toHaveBeenCalled();
  });

  it('rejects a technicianId that does not belong to a technician account', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'open' });
    usersRepository.findUserProfileById.mockResolvedValue({ role: 'student' });

    await expect(assignTechnician({ requestId: 1, technicianId: 'not-a-tech' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('creates the assignment, updates status, and logs history on success', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'open' });
    usersRepository.findUserProfileById.mockResolvedValue({ user_id: 'tech-1', role: 'technician' });

    const result = await assignTechnician({ requestId: 1, technicianId: 'tech-1' });

    expect(requestsRepository.insertTechnicianAssignment).toHaveBeenCalledWith({
      requestId: 1,
      technicianId: 'tech-1',
    });
    expect(requestsRepository.updateRequestStatus).toHaveBeenCalledWith(1, 'assigned');
    expect(requestsRepository.insertStatusHistory).toHaveBeenCalledWith({
      requestId: 1,
      previousStatus: 'open',
      newStatus: 'assigned',
    });
    expect(result).toEqual({ requestId: 1, status: 'assigned', technicianId: 'tech-1' });
  });
});

describe('updateRequestStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects setting status to "open" or "assigned" directly', async () => {
    await expect(
      updateRequestStatus({ requestId: 1, newStatus: 'assigned', actingUser: { role: 'administrator' } })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      updateRequestStatus({ requestId: 1, newStatus: 'open', actingUser: { role: 'administrator' } })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(requestsRepository.findRequestById).not.toHaveBeenCalled();
  });

  it('throws 404 if the request does not exist', async () => {
    requestsRepository.findRequestById.mockResolvedValue(null);

    await expect(
      updateRequestStatus({ requestId: 1, newStatus: 'in_progress', actingUser: { role: 'administrator' } })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an invalid transition (e.g. skipping straight to resolved)', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'open' });

    await expect(
      updateRequestStatus({ requestId: 1, newStatus: 'resolved', actingUser: { role: 'administrator' } })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a technician updating a request not assigned to them', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'assigned' });
    requestsRepository.findCurrentAssignment.mockResolvedValue({ technician_id: 'someone-else' });

    await expect(
      updateRequestStatus({
        requestId: 1,
        newStatus: 'in_progress',
        actingUser: { role: 'technician', user_id: 'tech-1' },
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a technician updating a request with no assignment at all', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'assigned' });
    requestsRepository.findCurrentAssignment.mockResolvedValue(null);

    await expect(
      updateRequestStatus({
        requestId: 1,
        newStatus: 'in_progress',
        actingUser: { role: 'technician', user_id: 'tech-1' },
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows the assigned technician to advance status and logs history', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'assigned' });
    requestsRepository.findCurrentAssignment.mockResolvedValue({ technician_id: 'tech-1' });

    const result = await updateRequestStatus({
      requestId: 1,
      newStatus: 'in_progress',
      actingUser: { role: 'technician', user_id: 'tech-1' },
    });

    expect(requestsRepository.updateRequestStatus).toHaveBeenCalledWith(1, 'in_progress');
    expect(requestsRepository.insertStatusHistory).toHaveBeenCalledWith({
      requestId: 1,
      previousStatus: 'assigned',
      newStatus: 'in_progress',
    });
    expect(result).toEqual({ requestId: 1, status: 'in_progress' });
  });

  it('allows an administrator to advance status without an assignment check', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, status: 'in_progress' });

    const result = await updateRequestStatus({
      requestId: 1,
      newStatus: 'resolved',
      actingUser: { role: 'administrator', user_id: 'admin-1' },
    });

    expect(requestsRepository.findCurrentAssignment).not.toHaveBeenCalled();
    expect(result).toEqual({ requestId: 1, status: 'resolved' });
  });
});

describe('createRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs a real status_history row for the initial "open" status, not just a display-time synthesis', async () => {
    requestsRepository.insertRequest.mockResolvedValue({ request_id: 1, status: 'open' });

    await createRequest({ studentId: 'student-1', categoryId: 1, description: 'Leaking tap' });

    expect(requestsRepository.insertStatusHistory).toHaveBeenCalledWith({
      requestId: 1,
      previousStatus: null,
      newStatus: 'open',
    });
  });

  it('rejects an invalid categoryId via the foreign-key-violation error code', async () => {
    const fkError = new Error('violates foreign key constraint');
    fkError.code = '23503';
    requestsRepository.insertRequest.mockRejectedValue(fkError);

    await expect(
      createRequest({ studentId: 'student-1', categoryId: 999, description: 'Leaking tap' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(requestsRepository.insertStatusHistory).not.toHaveBeenCalled();
  });

  it('uploads the photo before inserting when one is provided', async () => {
    storageRepository.uploadRequestPhoto.mockResolvedValue('https://example.com/photo.png');
    requestsRepository.insertRequest.mockResolvedValue({ request_id: 1, status: 'open' });

    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    await createRequest({
      studentId: 'student-1',
      categoryId: 1,
      description: 'Leaking tap',
      photoDataUrl: `data:image/png;base64,${tinyPngBase64}`,
    });

    expect(storageRepository.uploadRequestPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'student-1', contentType: 'image/png', extension: 'png' })
    );
    expect(requestsRepository.insertRequest).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: 'https://example.com/photo.png' })
    );
  });
});
