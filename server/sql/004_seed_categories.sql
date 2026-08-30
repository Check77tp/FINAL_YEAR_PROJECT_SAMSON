-- Seeds the standard maintenance categories named in CLAUDE.md's schema
-- comment. maintenance_requests.category_id is a required FK, so at least
-- these need to exist before any request (submission flow — checklist item
-- 2, not built yet) can reference one. Safe to re-run.

insert into public.categories (name, description) values
  ('Plumbing', 'Leaks, blocked drains, taps, toilets, and water heaters.'),
  ('Electrical', 'Lighting, sockets, switches, and wiring faults.'),
  ('Furniture', 'Beds, desks, chairs, wardrobes, and other room furniture.')
on conflict (name) do nothing;
