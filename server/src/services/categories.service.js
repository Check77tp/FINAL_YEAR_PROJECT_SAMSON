// Business logic layer for categories. Thin — there's no real business rule
// here yet, but the route still goes through a service per CLAUDE.md's
// layering rather than calling the repository directly.
import * as categoriesRepository from '../repositories/categories.repository.js';

export async function listCategories() {
  const rows = await categoriesRepository.findAllCategories();
  return rows.map((row) => ({ id: row.category_id, name: row.name, description: row.description }));
}
