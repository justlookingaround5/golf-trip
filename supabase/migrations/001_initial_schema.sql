-- ============================================================================
-- 001_initial_schema.sql
-- Consolidated schema — migrations 001 through 035
-- Run once in the Supabase SQL Editor on a fresh database.
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate a random 4-character alphanumeric join code (no ambiguous chars)
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := '';
  i     integer;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign a unique join code on trip insert
CREATE OR REPLACE FUNCTION set_trip_join_code()
RETURNS trigger AS $$
DECLARE
  new_code text;
  attempts integer := 0;
BEGIN
  IF NEW.join_code IS NULL THEN
    LOOP
      new_code := generate_join_code();
      IF NOT EXISTS (SELECT 1 FROM trips WHERE join_code = new_code AND id != NEW.id) THEN
        NEW.join_code := new_code;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 100 THEN
        RAISE EXCEPTION 'Could not generate unique join code after 100 attempts';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. groups (no FK deps)
CREATE TABLE groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

-- 2. trips (→ groups, auth.users; includes all column additions from 008/016/017/027/028)
CREATE TABLE trips (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  year           integer NOT NULL,
  location       text,
  status         text NOT NULL DEFAULT 'setup'
                   CHECK (status IN ('setup', 'active', 'completed')),
  match_buy_in   numeric(10,2) DEFAULT 100,
  skins_buy_in   numeric(10,2) DEFAULT 10,
  skins_mode     text DEFAULT 'net'
                   CHECK (skins_mode IN ('gross', 'net', 'both')),
  join_code      text,                                            -- 008
  settled_at     timestamptz,                                     -- 016
  group_id       uuid REFERENCES groups(id) ON DELETE SET NULL,   -- 017
  handicap_mode  text DEFAULT 'static'
                   CHECK (handicap_mode IN ('static', 'dynamic')),-- 027
  is_quick_round boolean DEFAULT false,                           -- 028
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  created_by     uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX idx_trips_join_code ON trips(join_code) WHERE join_code IS NOT NULL;

CREATE TRIGGER trips_set_join_code
  BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION set_trip_join_code();

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. players (→ auth.users; includes user_id from 002/026)
CREATE TABLE players (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text,
  phone           text,
  handicap_index  numeric(4,1),
  user_id         uuid REFERENCES auth.users(id),  -- 002/026
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_players_user_id ON players(user_id);

-- 4. courses (→ trips; includes all column additions from 018/027/030)
CREATE TABLE courses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  slope                 integer,
  rating                numeric(4,1),
  par                   integer NOT NULL DEFAULT 72,
  round_number          integer NOT NULL,
  round_date            date,
  golf_course_api_id    integer,                   -- 018
  default_match_format  text,                      -- 027
  default_point_value   numeric(4,1),              -- 027
  format_config         jsonb,                     -- 027
  latitude              double precision,           -- 030
  longitude             double precision,           -- 030
  created_at            timestamptz DEFAULT now()
);

-- 5. holes (→ courses; includes yardage from 018)
CREATE TABLE holes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number     integer NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par             integer NOT NULL CHECK (par BETWEEN 3 AND 5),
  handicap_index  integer NOT NULL CHECK (handicap_index BETWEEN 1 AND 18),
  yardage         jsonb DEFAULT '{}',  -- 018 (e.g. {"White": 345, "Blue": 372})
  UNIQUE (course_id, hole_number)
);

-- 6. trip_players (→ trips, players)
CREATE TABLE trip_players (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  paid       boolean DEFAULT false,
  UNIQUE (trip_id, player_id)
);

-- 7. player_profiles (→ auth.users; includes all columns from 002/004/015/019)
CREATE TABLE player_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name       text,
  avatar_url         text,
  ghin_number        text,
  handicap_index     numeric(4,1),
  home_club          text,
  home_club_logo_url text,   -- 004
  preferred_tee      text,
  bio                text,   -- 019
  venmo_username     text,   -- 015
  cashapp_cashtag    text,   -- 015
  zelle_email        text,   -- 015
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE TRIGGER player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. trip_members (→ trips, auth.users)
CREATE TABLE trip_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'player'
               CHECK (role IN ('owner', 'admin', 'player')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

-- 9. teams (→ trips; captain_trip_player_id → trip_players [nullable, 010])
CREATE TABLE teams (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name                   text NOT NULL,
  color                  text DEFAULT '#16a34a',  -- 010
  abbreviation           text,                    -- 010
  captain_trip_player_id uuid REFERENCES trip_players(id)  -- 010
);

-- 10. team_players (→ teams, trip_players)
CREATE TABLE team_players (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  UNIQUE (team_id, trip_player_id)
);

-- 11. player_course_handicaps (→ trip_players, courses)
CREATE TABLE player_course_handicaps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_player_id    uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  handicap_strokes  integer NOT NULL DEFAULT 0,
  UNIQUE (trip_player_id, course_id)
);

-- 12. game_formats (no FK deps)
CREATE TABLE game_formats (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,
  description    text,
  rules_summary  text,
  icon           text DEFAULT '⛳',
  scoring_type   text NOT NULL DEFAULT 'strokes'
                   CHECK (scoring_type IN ('points', 'match', 'strokes', 'dots', 'side_bet')),
  scope          text NOT NULL DEFAULT 'foursome'
                   CHECK (scope IN ('foursome', 'group')),
  min_players    integer NOT NULL DEFAULT 2,
  max_players    integer NOT NULL DEFAULT 20,
  team_based     boolean NOT NULL DEFAULT false,
  engine_key     text NOT NULL UNIQUE,
  default_config jsonb NOT NULL DEFAULT '{}',
  tier           integer NOT NULL DEFAULT 2 CHECK (tier BETWEEN 1 AND 3),
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

-- 13. round_games (→ courses, trips, game_formats, auth.users; includes join_code from 008)
CREATE TABLE round_games (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_id        uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  game_format_id uuid NOT NULL REFERENCES game_formats(id),
  config         jsonb NOT NULL DEFAULT '{}',
  buy_in         numeric(10,2) DEFAULT 0,
  status         text NOT NULL DEFAULT 'setup'
                   CHECK (status IN ('setup', 'active', 'finalized', 'cancelled')),
  join_code      text,  -- 008
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_round_games_join_code ON round_games(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX idx_round_games_course ON round_games(course_id);
CREATE INDEX idx_round_games_trip ON round_games(trip_id);

CREATE TRIGGER round_games_updated_at
  BEFORE UPDATE ON round_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 14. round_game_players (→ round_games, trip_players)
CREATE TABLE round_game_players (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_game_id  uuid NOT NULL REFERENCES round_games(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  side           text CHECK (side IN ('team_a', 'team_b', 'team_c', 'team_d', NULL)),
  metadata       jsonb DEFAULT '{}',
  UNIQUE (round_game_id, trip_player_id)
);

CREATE INDEX idx_rgp_round_game ON round_game_players(round_game_id);
CREATE INDEX idx_rgp_trip_player ON round_game_players(trip_player_id);

-- 15. game_results (→ round_games, trip_players)
CREATE TABLE game_results (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_game_id  uuid NOT NULL REFERENCES round_games(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  position       integer,
  points         numeric(10,2) DEFAULT 0,
  money          numeric(10,2) DEFAULT 0,
  details        jsonb DEFAULT '{}',
  computed_at    timestamptz DEFAULT now(),
  UNIQUE (round_game_id, trip_player_id)
);

CREATE INDEX idx_game_results_round_game ON game_results(round_game_id);
CREATE INDEX idx_game_results_trip_player ON game_results(trip_player_id);

-- 16. side_bets (→ trips)
CREATE TABLE side_bets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  bet_type     text NOT NULL
                 CHECK (bet_type IN ('birdie', 'eagle', 'greenie', 'sandie', 'barkie', 'chippie', 'arnie', 'custom')),
  custom_label text,
  value        numeric(10,2) NOT NULL DEFAULT 1,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (trip_id, bet_type)
);

-- 17. side_bet_hits (→ side_bets, trip_players, holes, courses)
CREATE TABLE side_bet_hits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  side_bet_id    uuid NOT NULL REFERENCES side_bets(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  hole_id        uuid NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  metadata       jsonb DEFAULT '{}',
  created_at     timestamptz DEFAULT now(),
  UNIQUE (side_bet_id, trip_player_id, hole_id)
);

CREATE INDEX idx_side_bet_hits_course ON side_bet_hits(course_id);
CREATE INDEX idx_side_bet_hits_player ON side_bet_hits(trip_player_id);

-- 18. settlement_ledger (→ trips, trip_players)
CREATE TABLE settlement_ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  source_type    text NOT NULL
                   CHECK (source_type IN ('game_result', 'side_bet', 'expense', 'adjustment')),
  source_id      uuid,
  amount         numeric(10,2) NOT NULL,
  description    text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_settlement_trip ON settlement_ledger(trip_id);
CREATE INDEX idx_settlement_player ON settlement_ledger(trip_player_id);
CREATE INDEX idx_settlement_source ON settlement_ledger(source_type, source_id);

-- 19. matches (→ courses; scorer_token is TEXT per migration 035)
CREATE TABLE matches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  format        text NOT NULL DEFAULT '2v2_best_ball'
                  CHECK (format IN ('1v1_stroke', '2v2_best_ball', '1v1_match', '2v2_alternate_shot')),
  point_value   numeric(4,1) DEFAULT 1,
  scorer_email  text,
  scorer_token  text,   -- TEXT (not uuid) per migration 035
  status        text DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed')),
  result        text,
  winner_side   text CHECK (winner_side IN ('team_a', 'team_b', 'tie')),
  created_at    timestamptz DEFAULT now()
);

-- 20. match_players (→ matches, trip_players)
CREATE TABLE match_players (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  side           text NOT NULL CHECK (side IN ('team_a', 'team_b')),
  UNIQUE (match_id, trip_player_id)
);

-- 21. scores (→ matches, trip_players, holes; includes stats from 032)
CREATE TABLE scores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  hole_id        uuid NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  gross_score    integer NOT NULL CHECK (gross_score BETWEEN 1 AND 20),
  fairway_hit    boolean,    -- 032
  gir            boolean,    -- 032
  putts          integer CHECK (putts BETWEEN 0 AND 10),  -- 032
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (match_id, trip_player_id, hole_id)
);

CREATE TRIGGER scores_updated_at
  BEFORE UPDATE ON scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 22. round_scores (→ courses, trip_players, holes, auth.users; includes stats from 027)
CREATE TABLE round_scores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  hole_id        uuid NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  gross_score    integer NOT NULL CHECK (gross_score BETWEEN 1 AND 20),
  fairway_hit    boolean,    -- 027
  gir            boolean,    -- 027
  putts          integer CHECK (putts >= 0 AND putts <= 10),  -- 027
  entered_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (course_id, trip_player_id, hole_id)
);

CREATE INDEX idx_round_scores_course ON round_scores(course_id);
CREATE INDEX idx_round_scores_player ON round_scores(trip_player_id);

CREATE TRIGGER round_scores_updated_at
  BEFORE UPDATE ON round_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 23. round_stats (→ courses, trip_players; includes detailed stats from 031)
CREATE TABLE round_stats (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id               uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_player_id          uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  gross_total             integer,
  net_total               integer,
  par_total               integer,
  holes_played            integer NOT NULL DEFAULT 0,
  eagles                  integer NOT NULL DEFAULT 0,
  birdies                 integer NOT NULL DEFAULT 0,
  pars                    integer NOT NULL DEFAULT 0,
  bogeys                  integer NOT NULL DEFAULT 0,
  double_bogeys           integer NOT NULL DEFAULT 0,
  others                  integer NOT NULL DEFAULT 0,
  par_or_better_streak    integer NOT NULL DEFAULT 0,
  bogey_or_better_streak  integer NOT NULL DEFAULT 0,
  best_hole_score         integer,
  best_hole_number        integer,
  worst_hole_score        integer,
  worst_hole_number       integer,
  best_hole_vs_par        integer,
  worst_hole_vs_par       integer,
  par3_total              integer,
  par3_count              integer DEFAULT 0,
  par4_total              integer,
  par4_count              integer DEFAULT 0,
  par5_total              integer,
  par5_count              integer DEFAULT 0,
  front_nine_gross        integer,
  front_nine_net          integer,
  back_nine_gross         integer,
  back_nine_net           integer,
  greens_in_regulation    integer NOT NULL DEFAULT 0,
  bounce_backs            integer NOT NULL DEFAULT 0,
  scoring_average         numeric(5,2),
  fairways_hit            integer NOT NULL DEFAULT 0,   -- 031
  fairways_total          integer NOT NULL DEFAULT 0,   -- 031
  total_putts             integer NOT NULL DEFAULT 0,   -- 031
  putts_per_hole          numeric(4,2),                 -- 031
  computed_at             timestamptz DEFAULT now(),
  UNIQUE (course_id, trip_player_id)
);

CREATE INDEX idx_round_stats_course ON round_stats(course_id);
CREATE INDEX idx_round_stats_player ON round_stats(trip_player_id);

-- 24. trip_stats (→ trips, trip_players, courses [nullable])
CREATE TABLE trip_stats (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_player_id         uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  total_gross            integer,
  total_net              integer,
  total_par              integer,
  total_holes            integer NOT NULL DEFAULT 0,
  total_rounds           integer NOT NULL DEFAULT 0,
  total_eagles           integer NOT NULL DEFAULT 0,
  total_birdies          integer NOT NULL DEFAULT 0,
  total_pars             integer NOT NULL DEFAULT 0,
  total_bogeys           integer NOT NULL DEFAULT 0,
  total_double_bogeys    integer NOT NULL DEFAULT 0,
  total_others           integer NOT NULL DEFAULT 0,
  best_round_gross       integer,
  best_round_course_id   uuid REFERENCES courses(id),
  worst_round_gross      integer,
  worst_round_course_id  uuid REFERENCES courses(id),
  longest_par_streak     integer NOT NULL DEFAULT 0,
  longest_bogey_streak   integer NOT NULL DEFAULT 0,
  total_bounce_backs     integer NOT NULL DEFAULT 0,
  scoring_average        numeric(5,2),
  computed_at            timestamptz DEFAULT now(),
  UNIQUE (trip_id, trip_player_id)
);

CREATE INDEX idx_trip_stats_trip ON trip_stats(trip_id);
CREATE INDEX idx_trip_stats_player ON trip_stats(trip_player_id);

-- 25. trip_awards (→ trips, trip_players)
CREATE TABLE trip_awards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  award_key         text NOT NULL,
  award_name        text NOT NULL,
  award_description text,
  award_icon        text DEFAULT '🏆',
  trip_player_id    uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  value             text,
  computed_at       timestamptz DEFAULT now(),
  UNIQUE (trip_id, award_key)
);

-- 26. player_round_tees (→ trip_players, courses)
CREATE TABLE player_round_tees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_player_id   uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  course_id        uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tee_name         text NOT NULL DEFAULT 'White',
  tee_slope        integer,
  tee_rating       numeric(4,1),
  tee_par          integer,
  course_handicap  integer,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (trip_player_id, course_id)
);

CREATE INDEX idx_player_round_tees_course ON player_round_tees(course_id);

-- 27. scorecard_preferences (→ auth.users)
CREATE TABLE scorecard_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  visible_columns jsonb NOT NULL DEFAULT '["gross", "net", "vs_par"]',
  view_mode       text NOT NULL DEFAULT 'standard'
                    CHECK (view_mode IN ('compact', 'standard', 'expanded')),
  updated_at      timestamptz DEFAULT now()
);

-- 28. trip_invites (→ trips, players, auth.users)
CREATE TABLE trip_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX idx_trip_invites_token ON trip_invites(token);
CREATE INDEX idx_trip_invites_email_trip ON trip_invites(email, trip_id);

-- 29. activity_feed (→ trips, trip_players, courses, holes, round_games)
CREATE TABLE activity_feed (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_type     text NOT NULL CHECK (event_type IN (
                   'score_posted', 'birdie', 'eagle', 'skin_won',
                   'game_result', 'lead_change', 'press', 'side_bet_hit',
                   'photo', 'round_started', 'round_finalized',
                   'player_joined', 'expense_added', 'custom'
                 )),
  trip_player_id uuid REFERENCES trip_players(id) ON DELETE SET NULL,
  course_id      uuid REFERENCES courses(id) ON DELETE SET NULL,
  hole_id        uuid REFERENCES holes(id) ON DELETE SET NULL,
  round_game_id  uuid REFERENCES round_games(id) ON DELETE SET NULL,
  title          text NOT NULL,
  detail         text,
  icon           text DEFAULT '⛳',
  photo_url      text,
  metadata       jsonb DEFAULT '{}',
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_feed_trip ON activity_feed(trip_id, created_at DESC);
CREATE INDEX idx_activity_feed_type ON activity_feed(event_type);

-- 30. trip_expenses (→ trips, trip_players, auth.users)
CREATE TABLE trip_expenses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description           text NOT NULL,
  category              text NOT NULL DEFAULT 'other'
                          CHECK (category IN ('lodging', 'food', 'transport', 'golf', 'entertainment', 'other')),
  amount                numeric(10,2) NOT NULL,
  paid_by_trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  split_among           jsonb,
  split_method          text NOT NULL DEFAULT 'even'
                          CHECK (split_method IN ('even', 'custom')),
  custom_splits         jsonb,
  receipt_url           text,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_expenses_trip ON trip_expenses(trip_id);

-- 31. trip_competitions (→ trips, teams)
CREATE TABLE trip_competitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name         text NOT NULL,
  format       text NOT NULL DEFAULT 'ryder_cup'
                 CHECK (format IN ('ryder_cup', 'presidents_cup', 'custom')),
  team_a_id    uuid NOT NULL REFERENCES teams(id),
  team_b_id    uuid NOT NULL REFERENCES teams(id),
  win_points   numeric(3,1) NOT NULL DEFAULT 1.0,
  tie_points   numeric(3,1) NOT NULL DEFAULT 0.5,
  loss_points  numeric(3,1) NOT NULL DEFAULT 0.0,
  status       text NOT NULL DEFAULT 'setup'
                 CHECK (status IN ('setup', 'active', 'completed')),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_competitions_trip ON trip_competitions(trip_id);

-- 32. competition_sessions (→ trip_competitions, courses)
CREATE TABLE competition_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  uuid NOT NULL REFERENCES trip_competitions(id) ON DELETE CASCADE,
  name            text NOT NULL,
  session_type    text NOT NULL
                    CHECK (session_type IN ('foursomes', 'four_ball', 'singles', 'custom')),
  course_id       uuid REFERENCES courses(id),
  session_order   integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'setup'
                    CHECK (status IN ('setup', 'active', 'completed')),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_sessions_competition ON competition_sessions(competition_id);

-- 33. competition_matches (→ competition_sessions, trip_players, round_games)
CREATE TABLE competition_matches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES competition_sessions(id) ON DELETE CASCADE,
  team_a_player_1  uuid NOT NULL REFERENCES trip_players(id),
  team_a_player_2  uuid REFERENCES trip_players(id),
  team_b_player_1  uuid NOT NULL REFERENCES trip_players(id),
  team_b_player_2  uuid REFERENCES trip_players(id),
  result           text,
  winner           text CHECK (winner IN ('team_a', 'team_b', 'tie')),
  points_team_a    numeric(3,1) DEFAULT 0,
  points_team_b    numeric(3,1) DEFAULT 0,
  round_game_id    uuid REFERENCES round_games(id),
  match_order      integer NOT NULL DEFAULT 1,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'active', 'completed')),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_comp_matches_session ON competition_matches(session_id);

-- 34. round_rsvps (→ courses, trip_players)
CREATE TABLE round_rsvps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'declined', 'maybe')),
  preferred_tee  text,
  preferred_time text CHECK (preferred_time IN ('early', 'late', 'any', NULL)),
  note           text,
  responded_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (course_id, trip_player_id)
);

CREATE INDEX idx_rsvp_course ON round_rsvps(course_id);

-- 35. player_wallets (→ players, trips)
CREATE TABLE player_wallets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_b_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  balance       numeric(10,2) NOT NULL DEFAULT 0,
  last_trip_id  uuid REFERENCES trips(id),
  last_updated  timestamptz DEFAULT now(),
  UNIQUE (player_a_id, player_b_id),
  CHECK (player_a_id < player_b_id)
);

CREATE INDEX idx_wallet_player_a ON player_wallets(player_a_id);
CREATE INDEX idx_wallet_player_b ON player_wallets(player_b_id);

-- 36. wallet_transactions (→ player_wallets, trips)
CREATE TABLE wallet_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id           uuid NOT NULL REFERENCES player_wallets(id) ON DELETE CASCADE,
  source_type         text NOT NULL
                        CHECK (source_type IN ('trip_settlement', 'manual_payment', 'adjustment')),
  source_trip_id      uuid REFERENCES trips(id),
  source_description  text,
  amount              numeric(10,2) NOT NULL,
  balance_after       numeric(10,2) NOT NULL,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);

-- 37. course_votes (→ trips, auth.users)
CREATE TABLE course_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  proposed_by uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

-- 38. course_vote_responses (→ course_votes, auth.users)
CREATE TABLE course_vote_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_vote_id   uuid NOT NULL REFERENCES course_votes(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id),
  vote             smallint NOT NULL CHECK (vote IN (-1, 0, 1)),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (course_vote_id, user_id)
);

-- 39. date_polls (→ trips, auth.users)
CREATE TABLE date_polls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date_option date NOT NULL,
  proposed_by uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

-- 40. date_poll_responses (→ date_polls, auth.users)
CREATE TABLE date_poll_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_poll_id  uuid NOT NULL REFERENCES date_polls(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  available     boolean NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (date_poll_id, user_id)
);

-- 41. friendships (→ auth.users)
CREATE TABLE friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 42. trip_messages (→ trips, auth.users; user_id nullable per 027, is_system/system_type from 027/033)
CREATE TABLE trip_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- nullable per 027
  content     text NOT NULL CHECK (char_length(content) <= 1000),
  is_system   boolean DEFAULT false,  -- 027
  system_type text,                   -- 033
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_trip_messages_trip ON trip_messages(trip_id, created_at DESC);

-- 43. activity_reactions (→ activity_feed, auth.users)
CREATE TABLE activity_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       text NOT NULL CHECK (emoji IN ('🔥', '👏', '😂', '💀', '⛳', '💰')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id, emoji)
);

CREATE INDEX idx_activity_reactions_activity ON activity_reactions(activity_id);

-- 44. activity_comments (→ activity_feed, auth.users)
CREATE TABLE activity_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_comments_activity ON activity_comments(activity_id);

-- 45. push_subscriptions (→ auth.users)
CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- 46. group_members (→ groups, auth.users)
CREATE TABLE group_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- 47. course_hole_maps (no FK deps)
CREATE TABLE course_hole_maps (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_api_id   integer NOT NULL,
  hole_number          integer NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  source               text NOT NULL CHECK (source IN ('osm', 'generated')),
  center_lat           double precision,
  center_lng           double precision,
  tee_polygons         jsonb DEFAULT '[]',
  fairway_polygons     jsonb DEFAULT '[]',
  green_polygons       jsonb DEFAULT '[]',
  bunker_polygons      jsonb DEFAULT '[]',
  water_polygons       jsonb DEFAULT '[]',
  hole_path            jsonb DEFAULT '[]',
  par                  integer,
  created_at           timestamptz DEFAULT now(),
  UNIQUE (golf_course_api_id, hole_number)
);

CREATE INDEX idx_course_hole_maps_api_id ON course_hole_maps(golf_course_api_id);

-- 48. course_osm_cache (no FK deps)
CREATE TABLE course_osm_cache (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_api_id  integer NOT NULL UNIQUE,
  osm_status          text NOT NULL CHECK (osm_status IN ('found', 'not_found')),
  latitude            double precision,
  longitude           double precision,
  fetched_at          timestamptz DEFAULT now()
);

-- ============================================================================
-- AUTH TRIGGER: auto-create player_profile on new signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.player_profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-create owner trip_members record for trips created_by this user
  INSERT INTO public.trip_members (trip_id, user_id, role)
  SELECT id, NEW.id, 'owner'
  FROM public.trips
  WHERE created_by = NEW.id
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- SECURITY DEFINER: breaks RLS recursion for group_members
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON trips FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON trips FOR ALL   USING (auth.role() = 'authenticated');

-- courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON courses FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON courses FOR ALL   USING (auth.role() = 'authenticated');

-- holes
ALTER TABLE holes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON holes FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON holes FOR ALL   USING (auth.role() = 'authenticated');

-- players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON players FOR ALL   USING (auth.role() = 'authenticated');

-- trip_players
ALTER TABLE trip_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON trip_players FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON trip_players FOR ALL   USING (auth.role() = 'authenticated');

-- player_course_handicaps
ALTER TABLE player_course_handicaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON player_course_handicaps FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON player_course_handicaps FOR ALL   USING (auth.role() = 'authenticated');

-- teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON teams FOR ALL   USING (auth.role() = 'authenticated');

-- team_players
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON team_players FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON team_players FOR ALL   USING (auth.role() = 'authenticated');

-- matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON matches FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON matches FOR ALL   USING (auth.role() = 'authenticated');

-- match_players
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON match_players FOR SELECT USING (true);
CREATE POLICY "Admin write"        ON match_players FOR ALL   USING (auth.role() = 'authenticated');

-- scores
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access"  ON scores FOR SELECT USING (true);
CREATE POLICY "Admin write scores"  ON scores FOR ALL   USING (auth.role() = 'authenticated');

-- player_profiles
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles"       ON player_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON player_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON player_profiles FOR UPDATE USING (auth.uid() = user_id);

-- trip_members
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trip_members"        ON trip_members FOR SELECT USING (true);
CREATE POLICY "Authenticated insert trip_members" ON trip_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owner/admin can update trip_members" ON trip_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);
CREATE POLICY "Owner can delete trip_members" ON trip_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
  )
);

-- game_formats
ALTER TABLE game_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read game_formats" ON game_formats FOR SELECT USING (true);
CREATE POLICY "Admin write game_formats" ON game_formats FOR ALL   USING (auth.role() = 'authenticated');

-- round_games
ALTER TABLE round_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read round_games"        ON round_games FOR SELECT USING (true);
CREATE POLICY "Authenticated write round_games" ON round_games FOR ALL   USING (auth.role() = 'authenticated');

-- round_game_players
ALTER TABLE round_game_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read round_game_players"        ON round_game_players FOR SELECT USING (true);
CREATE POLICY "Authenticated write round_game_players" ON round_game_players FOR ALL   USING (auth.role() = 'authenticated');

-- game_results
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read game_results"        ON game_results FOR SELECT USING (true);
CREATE POLICY "Authenticated write game_results" ON game_results FOR ALL   USING (auth.role() = 'authenticated');

-- side_bets
ALTER TABLE side_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read side_bets"        ON side_bets FOR SELECT USING (true);
CREATE POLICY "Authenticated write side_bets" ON side_bets FOR ALL   USING (auth.role() = 'authenticated');

-- side_bet_hits
ALTER TABLE side_bet_hits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read side_bet_hits"        ON side_bet_hits FOR SELECT USING (true);
CREATE POLICY "Authenticated write side_bet_hits" ON side_bet_hits FOR ALL   USING (auth.role() = 'authenticated');

-- settlement_ledger
ALTER TABLE settlement_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settlement_ledger"        ON settlement_ledger FOR SELECT USING (true);
CREATE POLICY "Authenticated write settlement_ledger" ON settlement_ledger FOR ALL   USING (auth.role() = 'authenticated');

-- round_stats
ALTER TABLE round_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read round_stats"        ON round_stats FOR SELECT USING (true);
CREATE POLICY "Authenticated write round_stats" ON round_stats FOR ALL   USING (auth.role() = 'authenticated');

-- trip_stats
ALTER TABLE trip_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trip_stats"        ON trip_stats FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_stats" ON trip_stats FOR ALL   USING (auth.role() = 'authenticated');

-- trip_awards
ALTER TABLE trip_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trip_awards"        ON trip_awards FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_awards" ON trip_awards FOR ALL   USING (auth.role() = 'authenticated');

-- player_round_tees
ALTER TABLE player_round_tees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read player_round_tees"        ON player_round_tees FOR SELECT USING (true);
CREATE POLICY "Authenticated write player_round_tees" ON player_round_tees FOR ALL   USING (auth.role() = 'authenticated');

-- scorecard_preferences
ALTER TABLE scorecard_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prefs"  ON scorecard_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users write own prefs" ON scorecard_preferences FOR ALL   USING (auth.uid() = user_id);

-- trip_invites
ALTER TABLE trip_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read invites by token" ON trip_invites FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert invites" ON trip_invites
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update invites" ON trip_invites
  FOR UPDATE TO authenticated USING (true);

-- activity_feed
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read activity_feed"        ON activity_feed FOR SELECT USING (true);
CREATE POLICY "Authenticated write activity_feed" ON activity_feed FOR ALL   USING (auth.role() = 'authenticated');

-- trip_expenses
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trip_expenses"        ON trip_expenses FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_expenses" ON trip_expenses FOR ALL   USING (auth.role() = 'authenticated');

-- trip_competitions
ALTER TABLE trip_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trip_competitions"        ON trip_competitions FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_competitions" ON trip_competitions FOR ALL   USING (auth.role() = 'authenticated');

-- competition_sessions
ALTER TABLE competition_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read competition_sessions"        ON competition_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated write competition_sessions" ON competition_sessions FOR ALL   USING (auth.role() = 'authenticated');

-- competition_matches
ALTER TABLE competition_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read competition_matches"        ON competition_matches FOR SELECT USING (true);
CREATE POLICY "Authenticated write competition_matches" ON competition_matches FOR ALL   USING (auth.role() = 'authenticated');

-- round_rsvps
ALTER TABLE round_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rsvps"        ON round_rsvps FOR SELECT USING (true);
CREATE POLICY "Authenticated write rsvps" ON round_rsvps FOR ALL   USING (auth.role() = 'authenticated');

-- player_wallets
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wallets"        ON player_wallets FOR SELECT USING (true);
CREATE POLICY "Authenticated write wallets" ON player_wallets FOR ALL   USING (auth.role() = 'authenticated');

-- wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wallet_tx"        ON wallet_transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated write wallet_tx" ON wallet_transactions FOR ALL   USING (auth.role() = 'authenticated');

-- course_votes
ALTER TABLE course_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read course_votes"              ON course_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert course_votes" ON course_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own course_votes"         ON course_votes FOR DELETE USING (auth.uid() = proposed_by);

-- course_vote_responses
ALTER TABLE course_vote_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read course_vote_responses"              ON course_vote_responses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert course_vote_responses" ON course_vote_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own course_vote_responses"         ON course_vote_responses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own course_vote_responses"         ON course_vote_responses FOR DELETE USING (auth.uid() = user_id);

-- date_polls
ALTER TABLE date_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read date_polls"              ON date_polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert date_polls" ON date_polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own date_polls"         ON date_polls FOR DELETE USING (auth.uid() = proposed_by);

-- date_poll_responses
ALTER TABLE date_poll_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read date_poll_responses"              ON date_poll_responses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert date_poll_responses" ON date_poll_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own date_poll_responses"         ON date_poll_responses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own date_poll_responses"         ON date_poll_responses FOR DELETE USING (auth.uid() = user_id);

-- friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can view own friendships"   ON friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "accepted friendships are public"  ON friendships FOR SELECT USING (status = 'accepted');
CREATE POLICY "users can send friend requests"   ON friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "parties can update friendship status" ON friendships FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "parties can delete friendship"    ON friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- trip_messages
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trip messages"     ON trip_messages FOR SELECT USING (true);
CREATE POLICY "Auth users can insert own messages" ON trip_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages"     ON trip_messages FOR DELETE USING (auth.uid() = user_id);

-- activity_reactions
ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reactions"          ON activity_reactions FOR SELECT USING (true);
CREATE POLICY "Auth users can insert own reactions" ON activity_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions"     ON activity_reactions FOR DELETE USING (auth.uid() = user_id);

-- activity_comments
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments"          ON activity_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert own comments" ON activity_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments"     ON activity_comments FOR DELETE USING (auth.uid() = user_id);

-- push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscriptions"   ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- round_scores
ALTER TABLE round_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON round_scores FOR SELECT USING (true);
CREATE POLICY "Auth write"  ON round_scores FOR ALL   USING (auth.role() = 'authenticated');

-- course_hole_maps
ALTER TABLE course_hole_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON course_hole_maps FOR SELECT USING (true);
CREATE POLICY "Auth write"  ON course_hole_maps FOR ALL   USING (auth.role() = 'authenticated');

-- course_osm_cache
ALTER TABLE course_osm_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON course_osm_cache FOR SELECT USING (true);
CREATE POLICY "Auth write"  ON course_osm_cache FOR ALL   USING (auth.role() = 'authenticated');

-- groups  (uses is_group_member, so defined after the function above)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their groups" ON groups FOR SELECT
  USING (created_by = auth.uid() OR public.is_group_member(id));
CREATE POLICY "Owners can manage groups" ON groups FOR ALL
  USING (created_by = auth.uid());

-- group_members  (uses is_group_member)
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group membership" ON group_members FOR SELECT
  USING (public.is_group_member(group_id));
CREATE POLICY "Group creators and admins can add members" ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
    OR group_id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
    )
  );
CREATE POLICY "Group owners can update members" ON group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );
CREATE POLICY "Group owners and admins can remove members" ON group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR group_id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE round_games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_results;
ALTER PUBLICATION supabase_realtime ADD TABLE side_bet_hits;
ALTER PUBLICATION supabase_realtime ADD TABLE settlement_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE round_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_messages;

-- ============================================================================
-- SEED: GAME FORMATS (16 rows)
-- ============================================================================

INSERT INTO game_formats (name, description, rules_summary, icon, scoring_type, scope, min_players, max_players, team_based, engine_key, default_config, tier) VALUES

-- TIER 1: Must-Have
('Skins',
 'Win holes outright to claim skins. Ties carry over.',
 '## Skins
Each hole is worth one "skin." The player with the sole lowest score wins the skin. If two or more players tie for lowest, the skin **carries over** to the next hole, increasing its value.

**Net vs Gross:** Configurable. Net skins apply handicap strokes per hole.

**Payout:** Total pot (buy-in × players) divided by total skins won.',
 '💰', 'strokes', 'group', 2, 20, false, 'skins',
 '{"mode": "net", "carry_over": true, "value_per_skin": null}', 1),

('Nassau',
 'Three bets in one: front 9, back 9, and overall 18.',
 '## Nassau
Three separate match play bets on a single round:
- **Front 9** — holes 1-9
- **Back 9** — holes 10-18
- **Overall 18** — full round

Each bet is worth the agreed amount. Player with lower net score on each segment wins that bet.

**Presses:** When a player is 2-down in any bet, they can "press" — starting a new bet from that hole forward within the segment. Presses can be automatic or manual.

**Payout:** Each bet pays independently. A player can win front, lose back, and tie overall.',
 '🏌️', 'match', 'foursome', 2, 4, false, 'nassau',
 '{"bet_amount": 5, "auto_press": true, "press_trigger": 2, "press_amount": null}', 1),

('Best Ball',
 'Team game — lowest net score from each team counts.',
 '## Best Ball
Teams of 2 (or more). Each player plays their own ball. On each hole, the **lowest net score** from each team is compared. Lower team score wins the hole.

Can be scored as match play (holes won/lost) or stroke play (total strokes).

**Handicap:** Full course handicap applied.',
 '⭐', 'match', 'foursome', 4, 8, true, 'best_ball',
 '{"scoring": "match_play", "handicap_pct": 100}', 1),

('Match Play',
 'Head-to-head, hole by hole. Win holes, not strokes.',
 '## Match Play
Two players (or two teams) compete hole-by-hole. The player/team with the lower net score **wins the hole**. Equal scores = hole is "halved."

The match status is tracked as holes up/down: "2UP" means leading by 2 holes. Match ends when one side is up by more holes than remain (e.g., "3&2" = 3 up with 2 to play).

**Handicap:** Difference between players'' course handicaps. Lower handicap gives strokes to higher.',
 '🤝', 'match', 'foursome', 2, 2, false, 'match_play',
 '{"handicap_pct": 100}', 1),

('Stroke Play',
 'Lowest total score wins. Simple as it gets.',
 '## Stroke Play
Every stroke counts. Lowest total score (gross or net) over the round wins.

**Net Stroke Play:** Course handicap subtracted from gross total. Levels the playing field.

**Payout:** Can be structured as winner-take-all, top-3, or proportional.',
 '📊', 'strokes', 'group', 2, 20, false, 'stroke_play',
 '{"mode": "net", "payout_structure": "top_3"}', 1),

('Scramble',
 'Team picks the best shot each time. Everyone plays from there.',
 '## Scramble
Teams of 2-4. On each shot, the team picks the **best result** and all players play their next shot from that spot.

**Scoring:** One team score per hole. Lowest team total wins.

**Handicap:** Typically a percentage of combined team handicap (e.g., 25% of total or 35% of lowest + 15% of highest).

Note: The app tracks final team score per hole. Shot selection happens on course.',
 '🏆', 'strokes', 'foursome', 4, 20, true, 'scramble',
 '{"handicap_formula": "25pct_combined"}', 1),

-- TIER 2: Games That Create Stories
('Wolf',
 'Rotating "Wolf" picks a partner or goes lone. High risk, high reward.',
 '## Wolf
Rotating player order each hole. The **Wolf** (first to tee off that hole) watches each subsequent player''s tee shot and decides:
- **Pick a partner** immediately after someone''s shot (can''t go back)
- **Go Lone Wolf** after seeing all shots — plays 1 vs 3 for double points
- **Blind Wolf** — declares Lone Wolf before anyone tees off for triple points

**Scoring:** Points per hole. Wolf+partner vs other two, or Lone Wolf vs field.

**Rotation:** Player order rotates each hole (1-2-3-4, 2-3-4-1, etc.).',
 '🐺', 'points', 'foursome', 4, 5, false, 'wolf',
 '{"point_value": 1, "lone_wolf_multiplier": 2, "blind_wolf_multiplier": 3}', 2),

('Stableford',
 'Points for scores relative to par. Rewards birdies, ignores blowups.',
 '## Stableford
Points awarded per hole based on net score relative to par:
- Double Eagle or better: **5 points**
- Eagle: **4 points**
- Birdie: **3 points**
- Par: **2 points**
- Bogey: **1 point**
- Double Bogey or worse: **0 points**

**Highest total points wins.** Great equalizer — one bad hole doesn''t ruin your round.',
 '🎯', 'points', 'group', 2, 20, false, 'stableford',
 '{"modified": false, "point_scale": {"double_eagle_plus": 5, "eagle": 4, "birdie": 3, "par": 2, "bogey": 1, "double_bogey_plus": 0}}', 2),

('Vegas',
 'Team scores combined as a two-digit number. Swings get wild.',
 '## Vegas (Daytona)
Two 2-player teams. On each hole, each team combines their scores into a **two-digit number** — lower score first.

Example: Team A scores 4 and 5 → **45**. Team B scores 3 and 6 → **36**. Difference: 45 - 36 = 9 points to Team B.

**The Flip:** If a player on a team makes birdie or better, the opposing team must put their **higher number first** (6 and 3 → **63** instead of 36). Swings can be massive.

**Payout:** Points multiplied by agreed $ value.',
 '🎰', 'points', 'foursome', 4, 4, true, 'vegas',
 '{"point_value": 0.25, "flip_on_birdie": true}', 2),

('Banker',
 'One player "banks" each hole — sets the bet, others must match.',
 '## Banker
3-6 players. One player is the **Banker** each hole (rotates). The Banker sets a point value. Each other player plays against the Banker:
- Beat the Banker = win the point value
- Lose to Banker = pay the point value
- Tie = push

**Doubles:** If Banker has the best score, they collect from everyone. If Banker has the worst, they pay everyone double.

**Rotation:** Banker rotates each hole.',
 '🏦', 'points', 'foursome', 3, 6, false, 'banker',
 '{"base_value": 1, "double_on_worst": true}', 2),

('Hammer',
 'Press game on steroids. Opponent can "hammer" to double the stakes.',
 '## Hammer
2-4 players. A match play bet where either side can **Hammer** (double the current stakes) at any point during a hole.

The other side must either **accept** (play at double) or **drop** (concede the hole at current value).

Multiple hammers per hole are allowed — stakes can escalate quickly.

**Payout:** Track cumulative points × value.',
 '🔨', 'match', 'foursome', 2, 4, false, 'hammer',
 '{"base_value": 1, "max_hammers_per_hole": null}', 2),

('Nine Point',
 'Three players, 9 points per hole. 5-3-1 or 4-3-2 split.',
 '## Nine Point (5-3-1)
Exactly 3 players. Each hole awards **9 total points**:
- Best net score: **5 points**
- Middle net score: **3 points**
- Worst net score: **1 point**

If two tie for best: 4-4-1. If two tie for worst: 5-2-2. All three tie: 3-3-3.

**Payout:** (Points - 27) × value per point after 9 holes. Par is 27 points (3 per hole × 9 holes).',
 '9️⃣', 'points', 'foursome', 3, 3, false, 'nine_point',
 '{"point_split": [5, 3, 1], "value_per_point": 1}', 2),

-- TIER 2 (Achievement games from migration 014)
('Dots / Trash',
 'Earn points for greenies, sandies, barkies, polies. Lose for 3-putts, water, OB.',
 NULL, '🎯', 'dots', 'group', 2, 20, false, 'dots',
 '{"enabled_dots": ["greenie","sandy","barkie","polie","chippy","birdie","eagle","double","three_putt","water","ob"], "per_point_value": 1}', 2),

('Snake',
 'Last person to 3-putt holds the snake and pays everyone.',
 NULL, '🐍', 'side_bet', 'group', 2, 20, false, 'snake',
 '{"snake_value": 5}', 2),

('Rabbit',
 'Win a hole outright to grab the rabbit. Hold it at end of 9 to collect.',
 NULL, '🐰', 'side_bet', 'group', 2, 20, false, 'rabbit',
 '{"rabbit_value": 5, "split_nines": true, "use_net": true}', 2),

-- TIER 2 (from migration 027)
('20-Ball',
 '2-player game: lock in exactly 20 net scores across both players.',
 'Each player locks in 8-12 holes. Lowest combined net wins.',
 '🎱', 'strokes', 'foursome', 2, 2, false, 'twenty_ball',
 '{"min_holes_per_player": 8, "max_holes_per_player": 12, "total_locks": 20}', 2)

ON CONFLICT (engine_key) DO NOTHING;

-- ============================================================================
-- STORAGE: photo bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-photos', 'trip-photos', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read trip photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-photos');

CREATE POLICY "Authenticated upload trip photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trip-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete trip photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
