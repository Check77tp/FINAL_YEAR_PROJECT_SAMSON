// Integration tests: real Express app + real routes, middleware and services,
// driven over HTTP with supertest. Only the outside world is faked:
//   - Supabase Auth (token -> user) and every repository (the database layer)
//   - push, AI and email side effects
// So these tests prove the layers work TOGETHER: routes -> services ->
// repositories, including authentication, role checks, validation and the
// error format. They need no database, network or credentials, which is what
// lets them run in CI on every push.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ---- Fake identities -------------------------------------------------------
const { USERS } = vi.hoisted(() => {
  const user = (id, name, role) => ({
    user_id: id,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@unza.zm`,
    id_number: id.slice(-4),
    role,
    availability_status: 'available',
    avatar_url: null,
  });
  return {
    USERS: {
      'student-token': user('00000000-0000-4000-8000-000000000001', 'Student One', 'student'),
      'student2-token': user('00000000-0000-4000-8000-000000000002', 'Student Two', 'student'),
      'admin-token': user('00000000-0000-4000-8000-000000000010', 'Admin One', 'administrator'),
      'tech-token': user('00000000-0000-4000-8000-000000000021', 'Tech One', 'technician'),
      'tech2-token': user('00000000-0000-4000-8000-000000000022', 'Tech Two', 'technician'),
    },
  };
});

// Supabase Auth: a token maps to a user id, anything else is rejected.
vi.mock('../../src/config/supabaseClient.js', () => ({
  supabase: {},
  createAuthClient: () => ({
    auth: {
      getUser: async (token) =>
        USERS[token]
          ? { data: { user: { id: USERS[token].user_id } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } },
    },
  }),
}));

vi.mock('../../src/repositories/requests.repository.js');
vi.mock('../../src/repositories/users.repository.js');
vi.mock('../../src/repositories/categories.repository.js');
vi.mock('../../src/repositories/ratings.repository.js');
vi.mock('../../src/repositories/upvotes.repository.js');
vi.mock('../../src/repositories/proofs.repository.js');
vi.mock('../../src/repositories/storage.repository.js');
vi.mock('../../src/repositories/reports.repository.js');
vi.mock('../../src/repositories/activity.repository.js');
vi.mock('../../src/repositories/push.repository.js');
vi.mock('../../src/repositories/announcements.repository.js');
vi.mock('../../src/repositories/comments.repository.js');
vi.mock('../../src/repositories/schedules.repository.js');
vi.mock('../../src/services/push.service.js');
vi.mock('../../src/config/anthropic.js', () => ({ aiEnabled: false, aiModel: 'test', anthropic: null }));

import app from '../../src/app.js';
import * as requestsRepository from '../../src/repositories/requests.repository.js';
import * as usersRepository from '../../src/repositories/users.repository.js';
import * as categoriesRepository from '../../src/repositories/categories.repository.js';
import * as upvotesRepository from '../../src/repositories/upvotes.repository.js';
import * as proofsRepository from '../../src/repositories/proofs.repository.js';
import * as storageRepository from '../../src/repositories/storage.repository.js';
import * as announcementsRepository from '../../src/repositories/announcements.repository.js';
import * as commentsRepository from '../../src/repositories/comments.repository.js';
import * as reportsRepository from '../../src/repositories/reports.repository.js';
import * as schedulesRepository from '../../src/repositories/schedules.repository.js';
import * as pushService from '../../src/services/push.service.js';

const STUDENT = USERS['student-token'];
const STUDENT2 = USERS['student2-token'];
const TECH = USERS['tech-token'];
const TECH2 = USERS['tech2-token'];

const as = (token) => ({ Authorization: `Bearer ${token}` });
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

// A row shaped like the repository's joined SELECT.
const requestRow = (over = {}) => ({
  request_id: 11,
  student_id: STUDENT.user_id,
  description: 'Tap is leaking',
  photo_url: null,
  status: 'open',
  hostel: 'Kalingalinga',
  room: 'C4',
  priority: 'medium',
  created_at: new Date().toISOString(),
  category: { category_id: 2, name: 'Plumbing' },
  technician_assignments: [],
  student: { user_id: STUDENT.user_id, name: STUDENT.name, id_number: STUDENT.id_number },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Auth lookup: verifyToken loads the profile by id.
  usersRepository.findUserProfileById.mockImplementation(
    async (id) => Object.values(USERS).find((u) => u.user_id === id) ?? null
  );
  upvotesRepository.countUpvotesForRequest.mockResolvedValue(0);
  upvotesRepository.findAllUpvotes.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
describe('platform basics', () => {
  it('GET /api/health is public and healthy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects a request with no token (401)', async () => {
    const res = await request(app).get('/api/requests/mine');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ status: 'error' });
  });

  it('rejects an invalid token (401) with the standard error shape', async () => {
    const res = await request(app).get('/api/requests/mine').set(as('not-a-real-token'));
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('the live-update stream also requires authentication', async () => {
    expect((await request(app).get('/api/events')).status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
describe('role-based access control (server-side)', () => {
  it.each([
    ['student', 'GET', '/api/requests', 'student-token'],
    ['student', 'GET', '/api/users/technicians', 'student-token'],
    ['student', 'GET', '/api/reports/analytics', 'student-token'],
    ['student', 'POST', '/api/requests/5/assign', 'student-token'],
    ['technician', 'POST', '/api/requests', 'tech-token'],
    ['technician', 'GET', '/api/requests', 'tech-token'],
    ['administrator', 'GET', '/api/requests/mine', 'admin-token'],
    ['administrator', 'POST', '/api/requests/triage', 'admin-token'],
  ])('%s cannot %s %s (403)', async (_role, method, path, token) => {
    const res = await request(app)[method.toLowerCase()](path).set(as(token)).send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/forbidden/i);
  });
});

// ---------------------------------------------------------------------------
describe('request submission flow (student)', () => {
  const valid = { categoryId: 2, description: 'Tap is leaking', hostel: 'Kalingalinga', room: 'C4', priority: 'high' };

  it('creates the request as "open" and logs the initial status_history row', async () => {
    requestsRepository.insertRequest.mockResolvedValue(requestRow({ priority: 'high' }));

    const res = await request(app).post('/api/requests').set(as('student-token')).send(valid);

    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({ requestId: 11, status: 'open', priority: 'high' });
    expect(requestsRepository.insertRequest).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: STUDENT.user_id, categoryId: 2, hostel: 'Kalingalinga', priority: 'high' })
    );
    expect(requestsRepository.insertStatusHistory).toHaveBeenCalledWith({
      requestId: 11,
      previousStatus: null,
      newStatus: 'open',
    });
  });

  it('always attributes the request to the authenticated student, never to a body field', async () => {
    requestsRepository.insertRequest.mockResolvedValue(requestRow());
    await request(app)
      .post('/api/requests')
      .set(as('student-token'))
      .send({ ...valid, studentId: STUDENT2.user_id, student_id: STUDENT2.user_id });
    expect(requestsRepository.insertRequest.mock.calls[0][0].studentId).toBe(STUDENT.user_id);
  });

  it.each([
    ['missing description', { description: '   ' }],
    ['missing hostel', { hostel: '' }],
    ['non-numeric category', { categoryId: 'abc' }],
    ['unknown priority', { priority: 'urgent!!' }],
  ])('validates input: %s (400, nothing saved)', async (_label, patch) => {
    const res = await request(app)
      .post('/api/requests')
      .set(as('student-token'))
      .send({ ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(requestsRepository.insertRequest).not.toHaveBeenCalled();
  });

  it('maps a foreign-key violation from the database to a clear 400', async () => {
    requestsRepository.insertRequest.mockRejectedValue({ code: '23503', message: 'fk' });
    const res = await request(app).post('/api/requests').set(as('student-token')).send(valid);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid category/i);
  });

  it('uploads an attached photo first and stores its URL', async () => {
    storageRepository.uploadRequestPhoto.mockResolvedValue('https://cdn/issue.jpg');
    requestsRepository.insertRequest.mockResolvedValue(requestRow({ photo_url: 'https://cdn/issue.jpg' }));

    const res = await request(app)
      .post('/api/requests')
      .set(as('student-token'))
      .send({ ...valid, photo: PHOTO });

    expect(res.status).toBe(201);
    expect(storageRepository.uploadRequestPhoto).toHaveBeenCalled();
    expect(requestsRepository.insertRequest.mock.calls[0][0].photoUrl).toBe('https://cdn/issue.jpg');
  });

  it('rejects a non-image "photo" (400) without creating the request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set(as('student-token'))
      .send({ ...valid, photo: 'data:text/html;base64,PGh0bWw+' });
    expect(res.status).toBe(400);
    expect(requestsRepository.insertRequest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe('assignment flow (administrator)', () => {
  it('assigns a technician: creates the assignment, moves to "assigned", logs history', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, student_id: STUDENT.user_id, status: 'open' });

    const res = await request(app)
      .post('/api/requests/5/assign')
      .set(as('admin-token'))
      .send({ technicianId: TECH.user_id });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ requestId: 5, status: 'assigned', technicianId: TECH.user_id });
    expect(requestsRepository.insertTechnicianAssignment).toHaveBeenCalledWith({ requestId: 5, technicianId: TECH.user_id });
    expect(requestsRepository.updateRequestStatus).toHaveBeenCalledWith(5, 'assigned');
    expect(requestsRepository.insertStatusHistory).toHaveBeenCalledWith({
      requestId: 5,
      previousStatus: 'open',
      newStatus: 'assigned',
    });
  });

  it('refuses to assign a request that is not open (400)', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, status: 'in_progress' });
    const res = await request(app).post('/api/requests/5/assign').set(as('admin-token')).send({ technicianId: TECH.user_id });
    expect(res.status).toBe(400);
    expect(requestsRepository.insertTechnicianAssignment).not.toHaveBeenCalled();
  });

  it('refuses to assign to an account that is not a technician (400)', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, status: 'open' });
    const res = await request(app).post('/api/requests/5/assign').set(as('admin-token')).send({ technicianId: STUDENT.user_id });
    expect(res.status).toBe(400);
    expect(requestsRepository.insertTechnicianAssignment).not.toHaveBeenCalled();
  });

  it('404s for an unknown request and 400s for a malformed technician id', async () => {
    requestsRepository.findRequestById.mockResolvedValue(null);
    expect(
      (await request(app).post('/api/requests/999/assign').set(as('admin-token')).send({ technicianId: TECH.user_id })).status
    ).toBe(404);
    expect(
      (await request(app).post('/api/requests/5/assign').set(as('admin-token')).send({ technicianId: 'nope' })).status
    ).toBe(400);
  });
});

// ---------------------------------------------------------------------------
describe('lifecycle over HTTP (technician / administrator)', () => {
  const assignedTo = (tech) => {
    requestsRepository.findCurrentAssignment.mockResolvedValue({ technician_id: tech.user_id });
  };

  it('the assigned technician can start work; the transition is logged', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, student_id: STUDENT.user_id, status: 'assigned' });
    assignedTo(TECH);

    const res = await request(app).patch('/api/requests/7/status').set(as('tech-token')).send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
    expect(requestsRepository.insertStatusHistory).toHaveBeenCalledWith({
      requestId: 7,
      previousStatus: 'assigned',
      newStatus: 'in_progress',
    });
  });

  it("another technician cannot touch it (403), and nothing changes", async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, status: 'assigned' });
    assignedTo(TECH);
    const res = await request(app).patch('/api/requests/7/status').set(as('tech2-token')).send({ status: 'in_progress' });
    expect(res.status).toBe(403);
    expect(requestsRepository.updateRequestStatus).not.toHaveBeenCalled();
  });

  it('skipping a step is rejected with an explanatory 400', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, status: 'assigned' });
    assignedTo(TECH);
    const res = await request(app).patch('/api/requests/7/status').set(as('tech-token')).send({ status: 'resolved' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/in_progress/);
    expect(requestsRepository.updateRequestStatus).not.toHaveBeenCalled();
  });

  it('"assigned" and "open" cannot be set directly through the status endpoint (400)', async () => {
    expect((await request(app).patch('/api/requests/7/status').set(as('admin-token')).send({ status: 'assigned' })).status).toBe(400);
    expect((await request(app).patch('/api/requests/7/status').set(as('admin-token')).send({ status: 'open' })).status).toBe(400);
  });

  it('a student cannot change status at all (403)', async () => {
    const res = await request(app).patch('/api/requests/7/status').set(as('student-token')).send({ status: 'closed' });
    expect(res.status).toBe(403);
  });

  it('an administrator can advance any request', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, student_id: STUDENT.user_id, status: 'resolved' });
    requestsRepository.findCurrentAssignment.mockResolvedValue(null);
    const res = await request(app).patch('/api/requests/7/status').set(as('admin-token')).send({ status: 'closed' });
    expect(res.status).toBe(200);
  });

  describe('resolving with proof of work', () => {
    beforeEach(() => {
      requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, student_id: STUDENT.user_id, status: 'in_progress' });
      assignedTo(TECH);
    });

    it('is allowed WITHOUT a photo by default (proof is optional)', async () => {
      const res = await request(app).patch('/api/requests/7/status').set(as('tech-token')).send({ status: 'resolved' });
      expect(res.status).toBe(200);
      expect(proofsRepository.upsertProof).not.toHaveBeenCalled();
    });

    it('stores the photo and note when provided, before changing the status', async () => {
      storageRepository.uploadResolutionPhoto.mockResolvedValue('https://cdn/proof.jpg');
      const order = [];
      proofsRepository.upsertProof.mockImplementation(async () => order.push('proof'));
      requestsRepository.updateRequestStatus.mockImplementation(async () => order.push('status'));

      const res = await request(app)
        .patch('/api/requests/7/status')
        .set(as('tech-token'))
        .send({ status: 'resolved', resolutionPhoto: PHOTO, resolutionNote: 'Replaced the washer' });

      expect(res.status).toBe(200);
      expect(order).toEqual(['proof', 'status']);
      expect(proofsRepository.upsertProof).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 7, photoUrl: 'https://cdn/proof.jpg', note: 'Replaced the washer', submittedBy: TECH.user_id })
      );
    });

    it('an invalid photo is rejected and the request stays in progress', async () => {
      const res = await request(app)
        .patch('/api/requests/7/status')
        .set(as('tech-token'))
        .send({ status: 'resolved', resolutionPhoto: 'data:text/plain;base64,aGk=' });
      expect(res.status).toBe(400);
      expect(requestsRepository.updateRequestStatus).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
describe('who can read a request', () => {
  const detailRow = (over = {}) => ({
    ...requestRow({ request_id: 21 }),
    status: 'in_progress',
    status_history: [
      { history_id: 1, previous_status: null, new_status: 'open', changed_at: '2026-09-01T10:00:00Z' },
      { history_id: 2, previous_status: 'open', new_status: 'assigned', changed_at: '2026-09-01T11:00:00Z' },
    ],
    technician_assignments: [
      { technician_id: TECH.user_id, assigned_at: '2026-09-01T11:00:00Z', technician: { user_id: TECH.user_id, name: TECH.name, availability_status: 'available' } },
    ],
    ...over,
  });

  beforeEach(() => {
    requestsRepository.findRequestDetailById.mockResolvedValue(detailRow());
  });

  it('the owner sees it, with its status timeline and SLA', async () => {
    const res = await request(app).get('/api/requests/21').set(as('student-token'));
    expect(res.status).toBe(200);
    expect(res.body.request.history.map((h) => h.newStatus)).toEqual(['open', 'assigned']);
    expect(res.body.request.sla).toMatchObject({ targetHours: 72 });
    expect(res.body.request.technician.name).toBe(TECH.name);
  });

  it('another student is refused (403)', async () => {
    expect((await request(app).get('/api/requests/21').set(as('student2-token'))).status).toBe(403);
  });

  it('only the assigned technician (and admins) may read it', async () => {
    expect((await request(app).get('/api/requests/21').set(as('tech-token'))).status).toBe(200);
    expect((await request(app).get('/api/requests/21').set(as('tech2-token'))).status).toBe(403);
    expect((await request(app).get('/api/requests/21').set(as('admin-token'))).status).toBe(200);
  });

  it('404 for a missing request, 400 for a malformed id', async () => {
    requestsRepository.findRequestDetailById.mockResolvedValue(null);
    expect((await request(app).get('/api/requests/999').set(as('admin-token'))).status).toBe(404);
    expect((await request(app).get('/api/requests/abc').set(as('admin-token'))).status).toBe(400);
  });

  it('a student only ever lists their own requests', async () => {
    requestsRepository.findRequestsByStudentId.mockResolvedValue([requestRow()]);
    const res = await request(app).get('/api/requests/mine').set(as('student-token'));
    expect(res.status).toBe(200);
    expect(requestsRepository.findRequestsByStudentId).toHaveBeenCalledWith(STUDENT.user_id);
  });
});

// ---------------------------------------------------------------------------
describe('upvotes and the community feed', () => {
  it('a student can back someone else\'s open request', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, student_id: STUDENT.user_id, status: 'open' });
    upvotesRepository.countUpvotesForRequest.mockResolvedValue(3);

    const res = await request(app).post('/api/requests/5/upvote').set(as('student2-token'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ hasUpvoted: true, upvoteCount: 3 });
    expect(upvotesRepository.insertUpvote).toHaveBeenCalledWith({ requestId: 5, userId: STUDENT2.user_id });
  });

  it('cannot upvote your own request, or a resolved one (400)', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, student_id: STUDENT.user_id, status: 'open' });
    expect((await request(app).post('/api/requests/5/upvote').set(as('student-token'))).status).toBe(400);

    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, student_id: STUDENT.user_id, status: 'resolved' });
    expect((await request(app).post('/api/requests/5/upvote').set(as('student2-token'))).status).toBe(400);
  });

  it('a repeated upvote is harmless (idempotent)', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, student_id: STUDENT.user_id, status: 'open' });
    upvotesRepository.insertUpvote.mockRejectedValue({ code: '23505' });
    expect((await request(app).post('/api/requests/5/upvote').set(as('student2-token'))).status).toBe(200);
  });

  it('removing an upvote works, and staff cannot upvote (403)', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 5, student_id: STUDENT.user_id, status: 'open' });
    const del = await request(app).delete('/api/requests/5/upvote').set(as('student2-token'));
    expect(del.status).toBe(200);
    expect(del.body.hasUpvoted).toBe(false);
    expect((await request(app).post('/api/requests/5/upvote').set(as('admin-token'))).status).toBe(403);
  });

  it('the community feed hides your own requests and never leaks other students\' identities', async () => {
    requestsRepository.findActiveRequestsForCommunity.mockResolvedValue([
      { request_id: 1, student_id: STUDENT.user_id, description: 'mine', status: 'open', hostel: 'Kalingalinga', priority: 'low', created_at: '2026-09-01', category: { category_id: 2, name: 'Plumbing' } },
      { request_id: 2, student_id: STUDENT2.user_id, description: 'theirs', status: 'open', hostel: 'Kalingalinga', priority: 'low', created_at: '2026-09-02', category: { category_id: 2, name: 'Plumbing' } },
    ]);
    requestsRepository.findRequestsByStudentId.mockResolvedValue([{ hostel: 'Kalingalinga' }]);
    upvotesRepository.findAllUpvotes.mockResolvedValue([{ request_id: 2, user_id: '00000000-0000-4000-8000-000000000099' }]);

    const res = await request(app).get('/api/requests/community').set(as('student-token'));

    expect(res.status).toBe(200);
    expect(res.body.requests.map((r) => r.requestId)).toEqual([2]);
    expect(res.body.requests[0].upvoteCount).toBe(1);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain(STUDENT2.user_id);
    expect(raw).not.toContain(STUDENT2.name);
  });
});

// ---------------------------------------------------------------------------
describe('triage suggestions', () => {
  beforeEach(() => {
    categoriesRepository.findAllCategories.mockResolvedValue([
      { category_id: 1, name: 'Plumbing', description: '' },
      { category_id: 2, name: 'Electrical', description: '' },
    ]);
  });

  it('suggests a category and forces hazards to critical (safety floor)', async () => {
    const res = await request(app)
      .post('/api/requests/triage')
      .set(as('student-token'))
      .send({ description: 'The wall socket is sparking and smells burnt' });
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toMatchObject({ categoryId: 2, priority: 'critical', source: 'rules' });
  });

  it('rejects a description that is too short (400)', async () => {
    const res = await request(app).post('/api/requests/triage').set(as('student-token')).send({ description: 'tap' });
    expect(res.status).toBe(400);
  });

  it('is rate limited per user (429 after 10 a minute)', async () => {
    const send = () =>
      request(app).post('/api/requests/triage').set(as('student2-token')).send({ description: 'The tap in my room drips all night' });
    for (let i = 0; i < 10; i += 1) expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
describe('smart assignment: technician list', () => {
  it('returns technicians best-first with workload and a recommendation', async () => {
    usersRepository.findUsersByRole.mockResolvedValue([
      { user_id: TECH.user_id, name: 'Tech One', id_number: '1', availability_status: 'available' },
      { user_id: TECH2.user_id, name: 'Tech Two', id_number: '2', availability_status: 'available' },
    ]);
    // Tech One has 2 active tasks, Tech Two has 0.
    requestsRepository.findActiveAssignmentTechnicianIds.mockResolvedValue([TECH.user_id, TECH.user_id]);

    const res = await request(app).get('/api/users/technicians').set(as('admin-token'));

    expect(res.status).toBe(200);
    expect(res.body.technicians.map((t) => t.name)).toEqual(['Tech Two', 'Tech One']);
    expect(res.body.technicians[0]).toMatchObject({ activeTasks: 0, recommended: true });
    expect(res.body.technicians[1]).toMatchObject({ activeTasks: 2, recommended: false });
  });
});

// ---------------------------------------------------------------------------
describe('technicians see how many students are affected', () => {
  it('assigned tasks carry an upvoteCount', async () => {
    requestsRepository.findRequestsAssignedToTechnician.mockResolvedValue([requestRow({ request_id: 31 }), requestRow({ request_id: 32 })]);
    upvotesRepository.findAllUpvotes.mockResolvedValue([
      { request_id: 31, user_id: 'a' },
      { request_id: 31, user_id: 'b' },
      { request_id: 31, user_id: 'c' },
    ]);

    const res = await request(app).get('/api/requests/assigned-to-me').set(as('tech-token'));

    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.requests.map((r) => [r.requestId, r.upvoteCount]));
    expect(byId).toEqual({ 31: 3, 32: 0 });
  });
});

// ---------------------------------------------------------------------------
describe('announcements', () => {
  const announcementRow = (over = {}) => ({
    announcement_id: 1,
    title: 'Water cut',
    message: 'No water 10:00-12:00',
    hostel: 'Kalingalinga',
    created_by: USERS['admin-token'].user_id,
    created_at: new Date().toISOString(),
    expires_at: null,
    author: { name: 'Admin One' },
    ...over,
  });

  it('only administrators can post or delete announcements (403 otherwise)', async () => {
    const body = { title: 'Water cut', message: 'No water 10:00-12:00', hostel: 'Kalingalinga' };
    expect((await request(app).post('/api/announcements').set(as('student-token')).send(body)).status).toBe(403);
    expect((await request(app).post('/api/announcements').set(as('tech-token')).send(body)).status).toBe(403);
    expect((await request(app).delete('/api/announcements/1').set(as('student-token'))).status).toBe(403);
  });

  it('an administrator posts one, it is stored and pushed to the hostel', async () => {
    announcementsRepository.insertAnnouncement.mockResolvedValue(announcementRow());
    usersRepository.findStudentIdsByHostel.mockResolvedValue([STUDENT.user_id]);
    requestsRepository.findLatestHostelPerStudent.mockResolvedValue(new Map());

    const res = await request(app)
      .post('/api/announcements')
      .set(as('admin-token'))
      .send({ title: 'Water cut', message: 'No water 10:00-12:00', hostel: 'Kalingalinga' });

    expect(res.status).toBe(201);
    expect(res.body.announcement).toMatchObject({ id: 1, hostel: 'Kalingalinga' });
    expect(res.body.recipients).toBe(1);
    expect(pushService.notifyUsers).toHaveBeenCalledWith([STUDENT.user_id], expect.objectContaining({ url: '/' }));
  });

  it('validation errors are 400 and nothing is stored', async () => {
    const res = await request(app).post('/api/announcements').set(as('admin-token')).send({ title: 'x', message: 'y' });
    expect(res.status).toBe(400);
    expect(announcementsRepository.insertAnnouncement).not.toHaveBeenCalled();
  });

  it('a student only receives the announcements for their hostel (and all-hostel ones)', async () => {
    announcementsRepository.findRecentAnnouncements.mockResolvedValue([
      announcementRow({ announcement_id: 1, hostel: null }),
      announcementRow({ announcement_id: 2, hostel: 'Kalingalinga' }),
      announcementRow({ announcement_id: 3, hostel: 'Soweto' }),
    ]);
    usersRepository.findHostelByUserId.mockResolvedValue('Kalingalinga');

    const res = await request(app).get('/api/announcements').set(as('student-token'));

    expect(res.status).toBe(200);
    expect(res.body.announcements.map((a) => a.id)).toEqual([1, 2]);
  });

  it('a student can set their hostel; an empty one is rejected', async () => {
    const ok = await request(app).put('/api/announcements/hostel/me').set(as('student-token')).send({ hostel: 'Soweto' });
    expect(ok.status).toBe(200);
    expect(usersRepository.updateHostel).toHaveBeenCalledWith(STUDENT.user_id, 'Soweto');
    const bad = await request(app).put('/api/announcements/hostel/me').set(as('student-token')).send({ hostel: '  ' });
    expect(bad.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
describe('comments on a request', () => {
  const commentRow = (over = {}) => ({
    comment_id: 1,
    request_id: 7,
    body: 'It is the shower tap',
    created_at: new Date().toISOString(),
    author: { user_id: STUDENT.user_id, name: STUDENT.name, role: 'student' },
    ...over,
  });

  beforeEach(() => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, student_id: STUDENT.user_id, status: 'in_progress' });
    requestsRepository.findCurrentAssignment.mockResolvedValue({ technician_id: TECH.user_id });
    commentsRepository.insertComment.mockResolvedValue(commentRow());
    commentsRepository.findCommentsByRequestId.mockResolvedValue([commentRow()]);
  });

  it('the student, the assigned technician and an admin can read and post', async () => {
    for (const token of ['student-token', 'tech-token', 'admin-token']) {
      const get = await request(app).get('/api/requests/7/comments').set(as(token));
      expect(get.status).toBe(200);
      expect(get.body.comments[0]).toMatchObject({ body: 'It is the shower tap', author: { role: 'student' } });

      const post = await request(app).post('/api/requests/7/comments').set(as(token)).send({ body: 'Thanks' });
      expect(post.status).toBe(201);
    }
  });

  it('comments are attributed to the authenticated user, not to a body field', async () => {
    await request(app).post('/api/requests/7/comments').set(as('student-token')).send({ body: 'hello', authorId: USERS['admin-token'].user_id });
    expect(commentsRepository.insertComment.mock.calls[0][0].authorId).toBe(STUDENT.user_id);
  });

  it('another student and an unassigned technician are refused (403)', async () => {
    for (const token of ['student2-token', 'tech2-token']) {
      expect((await request(app).get('/api/requests/7/comments').set(as(token))).status).toBe(403);
      expect((await request(app).post('/api/requests/7/comments').set(as(token)).send({ body: 'hi' })).status).toBe(403);
    }
    expect(commentsRepository.insertComment).not.toHaveBeenCalled();
  });

  it('empty comments and closed requests are rejected (400)', async () => {
    expect((await request(app).post('/api/requests/7/comments').set(as('student-token')).send({ body: '   ' })).status).toBe(400);
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, student_id: STUDENT.user_id, status: 'closed' });
    expect((await request(app).post('/api/requests/7/comments').set(as('student-token')).send({ body: 'hi' })).status).toBe(400);
  });

  it('requires authentication', async () => {
    expect((await request(app).get('/api/requests/7/comments')).status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
describe('recurring issue detection', () => {
  const plumbing = { category_id: 2, name: 'Plumbing' };
  const rec = (id, days) => ({
    request_id: id, hostel: 'Kalingalinga', room: 'Block C, Room 24', description: 'Tap leaks',
    status: 'closed', created_at: new Date(Date.now() - days * 86400e3).toISOString(), category: plumbing,
  });

  it('administrators get the repeated faults; everyone else is refused', async () => {
    reportsRepository.findRequestsForRecurrence.mockResolvedValue([rec(1, 30), rec(2, 15), rec(3, 2)]);

    const res = await request(app).get('/api/reports/recurring').set(as('admin-token'));

    expect(res.status).toBe(200);
    expect(res.body.issues).toHaveLength(1);
    expect(res.body.issues[0]).toMatchObject({ scope: 'room', count: 3, hostel: 'Kalingalinga', category: { name: 'Plumbing' } });
    expect((await request(app).get('/api/reports/recurring').set(as('student-token'))).status).toBe(403);
    expect((await request(app).get('/api/reports/recurring').set(as('tech-token'))).status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
describe('technician performance', () => {
  beforeEach(() => {
    const now = Date.now();
    const h = (n) => new Date(now - n * 3600e3).toISOString();
    usersRepository.findUsersByRole.mockResolvedValue([
      { user_id: TECH.user_id, name: 'Tech One', availability_status: 'available' },
      { user_id: TECH2.user_id, name: 'Tech Two', availability_status: 'available' },
    ]);
    reportsRepository.findAssignmentsForPerformance.mockResolvedValue([
      { request_id: 1, technician_id: TECH.user_id, assigned_at: h(90), request: { status: 'closed', priority: 'medium', created_at: h(100) } },
      { request_id: 2, technician_id: TECH2.user_id, assigned_at: h(30), request: { status: 'in_progress', priority: 'critical', created_at: h(40) } },
    ]);
    reportsRepository.findOpenAndResolvedHistory.mockResolvedValue([{ request_id: 1, new_status: 'resolved', changed_at: h(50) }]);
    reportsRepository.findRatingsWithRequest.mockResolvedValue([{ request_id: 1, rating: 5 }]);
  });

  it('administrators see every technician, ranked, with the right numbers', async () => {
    const res = await request(app).get('/api/reports/technician-performance?days=30').set(as('admin-token'));
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(30);
    expect(res.body.technicians[0]).toMatchObject({ name: 'Tech One', resolved: 1, onTimeRate: 100, avgRating: 5 });
    expect(res.body.technicians[1]).toMatchObject({ name: 'Tech Two', active: 1, overdueNow: 1 });
  });

  it('rejects an unsupported window (400) and non-admins (403)', async () => {
    expect((await request(app).get('/api/reports/technician-performance?days=13').set(as('admin-token'))).status).toBe(400);
    expect((await request(app).get('/api/reports/technician-performance').set(as('student-token'))).status).toBe(403);
    expect((await request(app).get('/api/reports/technician-performance').set(as('tech-token'))).status).toBe(403);
  });

  it('a technician sees only their own numbers and rank', async () => {
    const res = await request(app).get('/api/reports/my-performance').set(as('tech-token'));
    expect(res.status).toBe(200);
    expect(res.body.performance).toMatchObject({ name: 'Tech One', resolved: 1 });
    expect(res.body).toMatchObject({ rank: 1, outOf: 2 });
    expect((await request(app).get('/api/reports/my-performance').set(as('student-token'))).status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
describe('preventive maintenance schedules', () => {
  const scheduleRow = (over = {}) => ({
    schedule_id: 1, title: 'Inspect geysers', description: null, category_id: 2, hostel: 'Kalingalinga', room: null,
    priority: 'low', frequency_days: 30, next_due_at: new Date(Date.now() + 5 * 86400e3).toISOString(), active: true,
    created_by: USERS['admin-token'].user_id, created_at: new Date().toISOString(), last_generated_at: null,
    category: { category_id: 2, name: 'Plumbing' }, ...over,
  });

  beforeEach(() => {
    schedulesRepository.findLatestRunPerSchedule.mockResolvedValue(new Map());
  });

  it('is administrator-only (403 for students and technicians)', async () => {
    for (const token of ['student-token', 'tech-token']) {
      expect((await request(app).get('/api/schedules').set(as(token))).status).toBe(403);
      expect((await request(app).post('/api/schedules').set(as(token)).send({})).status).toBe(403);
      expect((await request(app).post('/api/schedules/1/run-now').set(as(token))).status).toBe(403);
    }
  });

  it('an administrator creates and lists a schedule', async () => {
    schedulesRepository.insertSchedule.mockResolvedValue(scheduleRow());
    schedulesRepository.findAllSchedules.mockResolvedValue([scheduleRow()]);

    const created = await request(app)
      .post('/api/schedules')
      .set(as('admin-token'))
      .send({ title: 'Inspect geysers', categoryId: 2, hostel: 'Kalingalinga', frequencyDays: 30 });
    expect(created.status).toBe(201);
    expect(created.body.schedule).toMatchObject({ title: 'Inspect geysers', frequencyDays: 30, hostel: 'Kalingalinga' });
    expect(schedulesRepository.insertSchedule).toHaveBeenCalledWith(expect.objectContaining({ createdBy: USERS['admin-token'].user_id }));

    const list = await request(app).get('/api/schedules').set(as('admin-token'));
    expect(list.status).toBe(200);
    expect(list.body.schedules).toHaveLength(1);
    expect(list.body.frequencies).toContain(30);
  });

  it('validation: unsupported frequency is 400', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set(as('admin-token'))
      .send({ title: 'Inspect geysers', categoryId: 2, hostel: 'Kalingalinga', frequencyDays: 11 });
    expect(res.status).toBe(400);
    expect(schedulesRepository.insertSchedule).not.toHaveBeenCalled();
  });

  it('"run now" creates a preventive request through the normal request flow', async () => {
    schedulesRepository.findScheduleById.mockResolvedValue(scheduleRow());
    requestsRepository.insertRequest.mockResolvedValue(requestRow({ request_id: 77 }));

    const res = await request(app).post('/api/schedules/1/run-now').set(as('admin-token'));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ scheduleId: 1, requestId: 77 });
    expect(requestsRepository.insertRequest).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/^Preventive maintenance: Inspect geysers/) })
    );
    expect(requestsRepository.insertStatusHistory).toHaveBeenCalledWith({ requestId: 77, previousStatus: null, newStatus: 'open' });
    expect(schedulesRepository.insertRun).toHaveBeenCalledWith({ scheduleId: 1, requestId: 77 });
  });

  it('"run now" is refused while the previous task is still open (400)', async () => {
    schedulesRepository.findScheduleById.mockResolvedValue(scheduleRow());
    schedulesRepository.findLatestRunPerSchedule.mockResolvedValue(new Map([[1, { request_id: 5, status: 'open' }]]));
    expect((await request(app).post('/api/schedules/1/run-now').set(as('admin-token'))).status).toBe(400);
    expect(requestsRepository.insertRequest).not.toHaveBeenCalled();
  });

  it('pause/resume and delete work; unknown ids are 404', async () => {
    schedulesRepository.findScheduleById.mockResolvedValue(scheduleRow());
    expect((await request(app).patch('/api/schedules/1').set(as('admin-token')).send({ active: false })).status).toBe(200);
    expect((await request(app).delete('/api/schedules/1').set(as('admin-token'))).status).toBe(200);
    schedulesRepository.findScheduleById.mockResolvedValue(null);
    expect((await request(app).delete('/api/schedules/9').set(as('admin-token'))).status).toBe(404);
  });

  it("preventive tasks never appear in a student's Already-reported feed", async () => {
    requestsRepository.findActiveRequestsForCommunity.mockResolvedValue([
      { request_id: 1, student_id: USERS['admin-token'].user_id, description: 'Preventive maintenance: Inspect geysers', status: 'open', hostel: 'Kalingalinga', priority: 'low', created_at: '2026-09-01', category: { category_id: 2, name: 'Plumbing' } },
      { request_id: 2, student_id: STUDENT2.user_id, description: 'Tap leaks', status: 'open', hostel: 'Kalingalinga', priority: 'low', created_at: '2026-09-02', category: { category_id: 2, name: 'Plumbing' } },
    ]);
    requestsRepository.findRequestsByStudentId.mockResolvedValue([{ hostel: 'Kalingalinga' }]);
    const res = await request(app).get('/api/requests/community').set(as('student-token'));
    expect(res.body.requests.map((r) => r.requestId)).toEqual([2]);
  });
});
