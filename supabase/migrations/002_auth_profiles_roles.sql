-- Player Profiles (linked to auth.users)
create table player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  display_name text,
  avatar_url text,
  ghin_number text,
  handicap_index numeric(4,1),
  home_club text,
  preferred_tee text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trip Members (role-based access)
create table trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('owner', 'admin', 'player')),
  created_at timestamptz default now(),
  unique (trip_id, user_id)
);

-- Add optional user_id column to existing players table
alter table players add column user_id uuid references auth.users(id);

-- Updated_at trigger for player_profiles
create trigger player_profiles_updated_at
  before update on player_profiles
  for each row execute function update_updated_at();

-- Auto-create profile on new auth.users signup
-- NOTE: SET search_path = public is required so GoTrue can resolve table names
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.player_profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );

  -- Auto-create owner records for trips where created_by matches this user
  insert into public.trip_members (trip_id, user_id, role)
  select id, new.id, 'owner'
  from public.trips
  where created_by = new.id
  on conflict (trip_id, user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer
set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS on player_profiles
alter table player_profiles enable row level security;

create policy "Public read profiles" on player_profiles
  for select using (true);

create policy "Users can insert own profile" on player_profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on player_profiles
  for update using (auth.uid() = user_id);

-- RLS on trip_members
alter table trip_members enable row level security;

create policy "Public read trip_members" on trip_members
  for select using (true);

create policy "Authenticated insert trip_members" on trip_members
  for insert with check (auth.role() = 'authenticated');

create policy "Owner/admin can update trip_members" on trip_members
  for update using (
    exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  );

create policy "Owner can delete trip_members" on trip_members
  for delete using (
    exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
        and tm.role = 'owner'
    )
  );
