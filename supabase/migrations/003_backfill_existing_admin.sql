-- Backfill: Create trip_members owner records for existing trips
-- Run this AFTER the existing admin signs in (so their auth.users row exists)
-- The DB trigger (handle_new_user) should handle this automatically,
-- but this covers trips created before the trigger was installed.

insert into trip_members (trip_id, user_id, role)
select t.id, t.created_by, 'owner'
from trips t
where t.created_by is not null
on conflict (trip_id, user_id) do nothing;
