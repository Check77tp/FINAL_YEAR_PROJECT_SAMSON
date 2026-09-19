// Business logic layer for user lookups outside of auth itself.
import * as usersRepository from '../repositories/users.repository.js';
import * as storageRepository from '../repositories/storage.repository.js';
import { httpError } from '../utils/httpError.js';

const AVAILABILITY_VALUES = ['available', 'on_job', 'off_duty'];
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const PHOTO_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,(.+)$/;

export async function listTechnicians() {
  const technicians = await usersRepository.findUsersByRole('technician');
  return technicians.map((t) => ({
    id: t.user_id,
    name: t.name,
    idNumber: t.id_number,
    availabilityStatus: t.availability_status,
  }));
}

// Technician action: set their own availability — an administrator reads
// this to decide who to assign next (see Manage Requests / Reports).
export async function setOwnAvailability(userId, availabilityStatus) {
  if (!AVAILABILITY_VALUES.includes(availabilityStatus)) {
    throw httpError(`availabilityStatus must be one of: ${AVAILABILITY_VALUES.join(', ')}`, 400);
  }
  const profile = await usersRepository.updateAvailabilityStatus(userId, availabilityStatus);
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

  return usersRepository.updateProfile(userId, {
    name: name?.trim(),
    avatarUrl,
  });
}
