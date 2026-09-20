// Business logic layer for user lookups outside of auth itself.
import * as usersRepository from '../repositories/users.repository.js';
import * as storageRepository from '../repositories/storage.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { httpError } from '../utils/httpError.js';
import { clearTokenCache } from './auth.service.js';

const AVAILABILITY_VALUES = ['available', 'on_job', 'off_duty'];
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const PHOTO_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,(.+)$/;

function mapUser(u) {
  return {
    id: u.user_id,
    name: u.name,
    email: u.email,
    idNumber: u.id_number,
    role: u.role,
    availabilityStatus: u.availability_status,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
  };
}

// Assignment recommendation rule (business logic): prefer technicians who are
// available over ones on a job, and never recommend anyone who is off duty;
// among equals, the one with the fewest active tasks wins, then alphabetical
// so the order is stable. `activeTasks` = requests currently assigned or in
// progress. Exported so it can be unit-tested without a database.
const AVAILABILITY_ORDER = { available: 0, on_job: 1, off_duty: 2 };

export function rankTechnicians(technicians, activeTaskCounts) {
  const ranked = technicians
    .map((t) => ({
      id: t.user_id,
      name: t.name,
      idNumber: t.id_number,
      availabilityStatus: t.availability_status,
      activeTasks: activeTaskCounts.get(t.user_id) || 0,
    }))
    .sort(
      (a, b) =>
        (AVAILABILITY_ORDER[a.availabilityStatus] ?? 1) - (AVAILABILITY_ORDER[b.availabilityStatus] ?? 1) ||
        a.activeTasks - b.activeTasks ||
        a.name.localeCompare(b.name)
    );

  const best = ranked[0];
  return ranked.map((t) => ({
    ...t,
    recommended: t === best && t.availabilityStatus !== 'off_duty',
  }));
}

// Best-first list of technicians with their current workload; the first entry
// is flagged `recommended` when someone is actually free to take the job.
export async function listTechnicians() {
  const [technicians, activeTechnicianIds] = await Promise.all([
    usersRepository.findUsersByRole('technician'),
    requestsRepository.findActiveAssignmentTechnicianIds(),
  ]);

  const counts = new Map();
  for (const id of activeTechnicianIds) counts.set(id, (counts.get(id) || 0) + 1);

  return rankTechnicians(technicians, counts);
}

// Administrator action (User Management page): every account, any role.
export async function listAllUsers() {
  const users = await usersRepository.findAllUsers();
  return users.map(mapUser);
}

// Technician action: set their own availability — an administrator reads
// this to decide who to assign next (see Manage Requests / Reports).
export async function setOwnAvailability(userId, availabilityStatus) {
  if (!AVAILABILITY_VALUES.includes(availabilityStatus)) {
    throw httpError(`availabilityStatus must be one of: ${AVAILABILITY_VALUES.join(', ')}`, 400);
  }
  const profile = await usersRepository.updateAvailabilityStatus(userId, availabilityStatus);
  clearTokenCache(); // cached profiles hold the old availability
  return { id: profile.user_id, availabilityStatus: profile.availability_status };
}

// Self-service profile edit, available to every role — name and/or avatar.
// Email, id_number, and role are deliberately not editable here: id_number
// is the login credential (see CLAUDE.md's ID-based login) and email is the
// underlying Supabase Auth identity, so changing either needs a dedicated,
// carefully-guarded flow this scope doesn't call for.
export async function updateOwnProfile(userId, { name, photoDataUrl }) {
  if (name !== undefined && !name.trim()) {
    throw httpError('Name cannot be empty', 400);
  }

  let avatarUrl;
  if (photoDataUrl) {
    const match = PHOTO_DATA_URL_PATTERN.exec(photoDataUrl);
    if (!match) {
      throw httpError('Photo must be a JPEG, PNG, or WebP image', 400);
    }

    const [, subtype, base64Data] = match;
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_AVATAR_BYTES) {
      throw httpError('Photo must be 3MB or smaller', 400);
    }

    avatarUrl = await storageRepository.uploadAvatar({
      userId,
      buffer,
      contentType: `image/${subtype}`,
      extension: subtype === 'jpeg' ? 'jpg' : subtype,
    });
  }

  const updated = await usersRepository.updateProfile(userId, {
    name: name?.trim(),
    avatarUrl,
  });
  clearTokenCache(); // cached profiles hold the old name/avatar
  return updated;
}
