-- Trip invites table for tracking email invitations
create table if not exists trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired')),
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  accepted_at timestamptz
);

-- Index for token lookups (join page)
create index if not exists idx_trip_invites_token on trip_invites(token);

-- Index for checking existing invites per email+trip
create index if not exists idx_trip_invites_email_trip on trip_invites(email, trip_id);

-- RLS
alter table trip_invites enable row level security;

-- Public can read invites by token (needed for join page before auth)
create policy "Anyone can read invites by token"
  on trip_invites for select
  using (true);

-- Authenticated users can insert invites
create policy "Authenticated users can insert invites"
  on trip_invites for insert
  to authenticated
  with check (true);

-- Authenticated users can update invites (accept)
create policy "Authenticated users can update invites"
  on trip_invites for update
  to authenticated
  using (true);
