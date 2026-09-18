// Business logic layer for user lookups outside of auth itself.
import * as usersRepository from '../repositories/users.repository.js';
import { httpError } from '../utils/httpError.js';

const AVAILABILITY_VALUES = ['available', 'on_job', 'off_duty'];

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
