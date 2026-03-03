-- ============================================================================
-- Migration 010: Ryder Cup Team Competition Mode
-- ============================================================================

-- Extend existing teams table with competition features
ALTER TABLE teams ADD COLUMN IF NOT EXISTS color text DEFAULT '#16a34a';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS abbreviation text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_trip_player_id uuid REFERENCES trip_players(id);

-- Trip competitions — wraps multiple rounds into one scored event
CREATE TABLE trip_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  name text NOT NULL,
  format text NOT NULL DEFAULT 'ryder_cup'
    CHECK (format IN ('ryder_cup', 'presidents_cup', 'custom')),

  team_a_id uuid NOT NULL REFERENCES teams(id),
  team_b_id uuid NOT NULL REFERENCES teams(id),

  win_points numeric(3,1) NOT NULL DEFAULT 1.0,
  tie_points numeric(3,1) NOT NULL DEFAULT 0.5,
  loss_points numeric(3,1) NOT NULL DEFAULT 0.0,

  status text NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'active', 'completed')),

  created_at timestamptz DEFAULT now()
);

-- Competition sessions — each round/session within the competition
CREATE TABLE competition_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES trip_competitions(id) ON DELETE CASCADE,

  name text NOT NULL,
  session_type text NOT NULL
    CHECK (session_type IN ('foursomes', 'four_ball', 'singles', 'custom')),

  course_id uuid REFERENCES courses(id),
  session_order integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'active', 'completed')),

  created_at timestamptz DEFAULT now()
);

-- Competition matches — individual pairings within a session
CREATE TABLE competition_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES competition_sessions(id) ON DELETE CASCADE,

  team_a_player_1 uuid NOT NULL REFERENCES trip_players(id),
  team_a_player_2 uuid REFERENCES trip_players(id),

  team_b_player_1 uuid NOT NULL REFERENCES trip_players(id),
  team_b_player_2 uuid REFERENCES trip_players(id),

  result text,
  winner text CHECK (winner IN ('team_a', 'team_b', 'tie')),
  points_team_a numeric(3,1) DEFAULT 0,
  points_team_b numeric(3,1) DEFAULT 0,

  round_game_id uuid REFERENCES round_games(id),

  match_order integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed')),

  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_competitions_trip ON trip_competitions(trip_id);
CREATE INDEX idx_sessions_competition ON competition_sessions(competition_id);
CREATE INDEX idx_comp_matches_session ON competition_matches(session_id);

-- RLS
ALTER TABLE trip_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trip_competitions" ON trip_competitions FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_competitions" ON trip_competitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read competition_sessions" ON competition_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated write competition_sessions" ON competition_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read competition_matches" ON competition_matches FOR SELECT USING (true);
CREATE POLICY "Authenticated write competition_matches" ON competition_matches FOR ALL USING (auth.role() = 'authenticated');
