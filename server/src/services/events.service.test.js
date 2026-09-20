import { describe, it, expect, vi } from 'vitest';
import { addConnection, publish, announceRequestChange, connectionCount } from './events.service.js';

describe('events hub', () => {
  it('delivers to the named user and to everyone with a listed role, but nobody else', () => {
    const student = vi.fn();
    const otherStudent = vi.fn();
    const admin = vi.fn();
    const techNotTargeted = vi.fn();
    const cleanups = [
      addConnection({ userId: 's1', role: 'student', write: student }),
      addConnection({ userId: 's2', role: 'student', write: otherStudent }),
      addConnection({ userId: 'a1', role: 'administrator', write: admin }),
      addConnection({ userId: 't1', role: 'technician', write: techNotTargeted }),
    ];

    announceRequestChange({ requestId: 7, userIds: ['s1'], actorId: 'a1', message: 'Request #7 updated' });

    expect(student).toHaveBeenCalledTimes(1);
    expect(admin).toHaveBeenCalledTimes(1); // admins always hear about request changes
    expect(otherStudent).not.toHaveBeenCalled();
    expect(techNotTargeted).not.toHaveBeenCalled();

    const sent = student.mock.calls[0][0];
    expect(sent).toContain('event: request');
    expect(JSON.parse(sent.split('data: ')[1])).toMatchObject({ requestId: 7, actorId: 'a1' });

    cleanups.forEach((c) => c());
  });

  it('removes a connection on cleanup and survives a write that throws', () => {
    const broken = vi.fn(() => {
      throw new Error('socket closed');
    });
    const before = connectionCount();
    const remove = addConnection({ userId: 'x', role: 'student', write: broken });
    expect(connectionCount()).toBe(before + 1);

    expect(() => publish({ userIds: ['x'], event: { type: 'request_changed' } })).not.toThrow();

    remove();
    expect(connectionCount()).toBe(before);
  });
});
