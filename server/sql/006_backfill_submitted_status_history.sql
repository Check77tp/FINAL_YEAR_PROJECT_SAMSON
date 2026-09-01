-- Already applied programmatically (see requests.service.js createRequest,
-- which now writes this row at creation time going forward). This backfills
-- the same row for requests created before that existed, so every request —
-- old or new — has a complete, queryable status_history from 'open' onward.
-- Idempotent: only inserts where a request has no 'open' row yet.

insert into public.status_history (request_id, previous_status, new_status, changed_at)
select mr.request_id, null, 'open', mr.created_at
from public.maintenance_requests mr
where not exists (
  select 1 from public.status_history sh
  where sh.request_id = mr.request_id and sh.new_status = 'open'
);
