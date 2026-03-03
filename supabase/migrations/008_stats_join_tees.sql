-- ============================================================================
-- Migration 008: Stats Cache, Join Codes, Per-Round Tee Selection
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Round stats cache — precomputed stats per player per course
-- ---------------------------------------------------------------------------

CREATE TABLE round_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,

  -- Core stats
  gross_total integer,
  net_total integer,
  par_total integer,
  holes_played integer NOT NULL DEFAULT 0,

  -- Scoring distribution
  eagles integer NOT NULL DEFAULT 0,
  birdies integer NOT NULL DEFAULT 0,
  pars integer NOT NULL DEFAULT 0,
  bogeys integer NOT NULL DEFAULT 0,
  double_bogeys integer NOT NULL DEFAULT 0,
  others integer NOT NULL DEFAULT 0,

  -- Streaks
  par_or_better_streak integer NOT NULL DEFAULT 0,
  bogey_or_better_streak integer NOT NULL DEFAULT 0,

  -- Extremes
  best_hole_score integer,
  best_hole_number integer,
  worst_hole_score integer,
  worst_hole_number integer,
  best_hole_vs_par integer,
  worst_hole_vs_par integer,

  -- Par-type breakdown
  par3_total integer,
  par3_count integer DEFAULT 0,
  par4_total integer,
  par4_count integer DEFAULT 0,
  par5_total integer,
  par5_count integer DEFAULT 0,

  -- Nine breakdown
  front_nine_gross integer,
  front_nine_net integer,
  back_nine_gross integer,
  back_nine_net integer,

  -- GIR proxy
  greens_in_regulation integer NOT NULL DEFAULT 0,

  -- Bounce-back
  bounce_backs integer NOT NULL DEFAULT 0,

  -- Consistency
  scoring_average numeric(5,2),

  computed_at timestamptz DEFAULT now(),

  UNIQUE (course_id, trip_player_id)
);

CREATE INDEX idx_round_stats_course ON round_stats(course_id);
CREATE INDEX idx_round_stats_player ON round_stats(trip_player_id);

-- ---------------------------------------------------------------------------
-- 2. Trip stats — aggregated across all rounds
-- ---------------------------------------------------------------------------

CREATE TABLE trip_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,

  total_gross integer,
  total_net integer,
  total_par integer,
  total_holes integer NOT NULL DEFAULT 0,
  total_rounds integer NOT NULL DEFAULT 0,

  total_eagles integer NOT NULL DEFAULT 0,
  total_birdies integer NOT NULL DEFAULT 0,
  total_pars integer NOT NULL DEFAULT 0,
  total_bogeys integer NOT NULL DEFAULT 0,
  total_double_bogeys integer NOT NULL DEFAULT 0,
  total_others integer NOT NULL DEFAULT 0,

  best_round_gross integer,
  best_round_course_id uuid REFERENCES courses(id),
  worst_round_gross integer,
  worst_round_course_id uuid REFERENCES courses(id),

  longest_par_streak integer NOT NULL DEFAULT 0,
  longest_bogey_streak integer NOT NULL DEFAULT 0,
  total_bounce_backs integer NOT NULL DEFAULT 0,

  scoring_average numeric(5,2),

  computed_at timestamptz DEFAULT now(),

  UNIQUE (trip_id, trip_player_id)
);

CREATE INDEX idx_trip_stats_trip ON trip_stats(trip_id);
CREATE INDEX idx_trip_stats_player ON trip_stats(trip_player_id);

-- ---------------------------------------------------------------------------
-- 3. Trip awards — auto-generated superlatives
-- ---------------------------------------------------------------------------

CREATE TABLE trip_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  award_key text NOT NULL,
  award_name text NOT NULL,
  award_description text,
  award_icon text DEFAULT '🏆',

  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  value text,

  computed_at timestamptz DEFAULT now(),

  UNIQUE (trip_id, award_key)
);

-- ---------------------------------------------------------------------------
-- 4. Join codes
-- ---------------------------------------------------------------------------

ALTER TABLE round_games ADD COLUMN IF NOT EXISTS join_code text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_round_games_join_code
  ON round_games(join_code) WHERE join_code IS NOT NULL;

ALTER TABLE trips ADD COLUMN IF NOT EXISTS join_code text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_join_code
  ON trips(join_code) WHERE join_code IS NOT NULL;

-- Function to generate a unique 4-digit alphanumeric code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i integer;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate join code on trip creation
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

CREATE TRIGGER trips_set_join_code
  BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION set_trip_join_code();

-- Backfill join codes for existing trips
UPDATE trips SET join_code = generate_join_code() WHERE join_code IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Per-round tee selection
-- ---------------------------------------------------------------------------

CREATE TABLE player_round_tees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  tee_name text NOT NULL DEFAULT 'White',
  tee_slope integer,
  tee_rating numeric(4,1),
  tee_par integer,

  course_handicap integer,

  created_at timestamptz DEFAULT now(),

  UNIQUE (trip_player_id, course_id)
);

CREATE INDEX idx_player_round_tees_course ON player_round_tees(course_id);

-- ---------------------------------------------------------------------------
-- 6. Scorecard display preferences (per-user)
-- ---------------------------------------------------------------------------

CREATE TABLE scorecard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  visible_columns jsonb NOT NULL DEFAULT '["gross", "net", "vs_par"]',

  view_mode text NOT NULL DEFAULT 'standard'
    CHECK (view_mode IN ('compact', 'standard', 'expanded')),

  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE round_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_round_tees ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read round_stats" ON round_stats FOR SELECT USING (true);
CREATE POLICY "Authenticated write round_stats" ON round_stats FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read trip_stats" ON trip_stats FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_stats" ON trip_stats FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read trip_awards" ON trip_awards FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_awards" ON trip_awards FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read player_round_tees" ON player_round_tees FOR SELECT USING (true);
CREATE POLICY "Authenticated write player_round_tees" ON player_round_tees FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users read own prefs" ON scorecard_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users write own prefs" ON scorecard_preferences FOR ALL USING (auth.uid() = user_id);
