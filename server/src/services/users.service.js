// Business logic layer for user lookups outside of auth itself.
import * as usersRepository from '../repositories/users.repository.js';

export async function listTechnicians() {
  const technicians = await usersRepository.findUsersByRole('technician');
  return technicians.map((t) => ({ id: t.user_id, name: t.name, idNumber: t.id_number }));
}
