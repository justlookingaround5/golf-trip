-- Trips
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  location text,
  status text not null default 'setup' check (status in ('setup', 'active', 'completed')),
  match_buy_in numeric(10,2) default 100,
  skins_buy_in numeric(10,2) default 10,
  skins_mode text default 'net' check (skins_mode in ('gross', 'net', 'both')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  slope integer,
  rating numeric(4,1),
  par integer not null default 72,
  round_number integer not null,
  round_date date,
  created_at timestamptz default now()
);

-- Holes
create table holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  hole_number integer not null check (hole_number between 1 and 18),
  par integer not null check (par between 3 and 5),
  handicap_index integer not null check (handicap_index between 1 and 18),
  unique (course_id, hole_number)
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  handicap_index numeric(4,1),
  created_at timestamptz default now()
);

-- Trip-Player join
create table trip_players (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  paid boolean default false,
  unique (trip_id, player_id)
);

-- Course-specific handicap strokes
create table player_course_handicaps (
  id uuid primary key default gen_random_uuid(),
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  handicap_strokes integer not null default 0,
  unique (trip_player_id, course_id)
);

-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null
);

-- Team-Player join
create table team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  unique (team_id, trip_player_id)
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  format text not null default '2v2_best_ball' check (format in ('1v1_stroke', '2v2_best_ball', '1v1_match', '2v2_alternate_shot')),
  point_value numeric(4,1) default 1,
  scorer_email text,
  scorer_token uuid default gen_random_uuid(),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  result text,
  winner_side text check (winner_side in ('team_a', 'team_b', 'tie')),
  created_at timestamptz default now()
);

-- Match players
create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  side text not null check (side in ('team_a', 'team_b')),
  unique (match_id, trip_player_id)
);

-- Scores
create table scores (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  hole_id uuid not null references holes(id) on delete cascade,
  gross_score integer not null check (gross_score between 1 and 20),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (match_id, trip_player_id, hole_id)
);

-- Enable realtime on scores
alter publication supabase_realtime add table scores;

-- RLS policies
alter table trips enable row level security;
alter table courses enable row level security;
alter table holes enable row level security;
alter table players enable row level security;
alter table trip_players enable row level security;
alter table player_course_handicaps enable row level security;
alter table teams enable row level security;
alter table team_players enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table scores enable row level security;

-- Public read access
create policy "Public read access" on trips for select using (true);
create policy "Public read access" on courses for select using (true);
create policy "Public read access" on holes for select using (true);
create policy "Public read access" on players for select using (true);
create policy "Public read access" on trip_players for select using (true);
create policy "Public read access" on player_course_handicaps for select using (true);
create policy "Public read access" on teams for select using (true);
create policy "Public read access" on team_players for select using (true);
create policy "Public read access" on matches for select using (true);
create policy "Public read access" on match_players for select using (true);
create policy "Public read access" on scores for select using (true);

-- Admin write access
create policy "Admin write" on trips for all using (auth.role() = 'authenticated');
create policy "Admin write" on courses for all using (auth.role() = 'authenticated');
create policy "Admin write" on holes for all using (auth.role() = 'authenticated');
create policy "Admin write" on players for all using (auth.role() = 'authenticated');
create policy "Admin write" on trip_players for all using (auth.role() = 'authenticated');
create policy "Admin write" on player_course_handicaps for all using (auth.role() = 'authenticated');
create policy "Admin write" on teams for all using (auth.role() = 'authenticated');
create policy "Admin write" on team_players for all using (auth.role() = 'authenticated');
create policy "Admin write" on matches for all using (auth.role() = 'authenticated');
create policy "Admin write" on match_players for all using (auth.role() = 'authenticated');
create policy "Admin write scores" on scores for all using (auth.role() = 'authenticated');

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trips_updated_at before update on trips for each row execute function update_updated_at();
create trigger scores_updated_at before update on scores for each row execute function update_updated_at();
