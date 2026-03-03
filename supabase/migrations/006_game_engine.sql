-- ============================================================================
-- Migration 006: Game Engine Foundation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. game_formats — library of available game types
-- ---------------------------------------------------------------------------

CREATE TABLE game_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display
  name text NOT NULL UNIQUE,
  description text,
  rules_summary text,
  icon text DEFAULT '⛳',

  -- Classification (Beezer taxonomy)
  scoring_type text NOT NULL DEFAULT 'strokes'
    CHECK (scoring_type IN ('points', 'match', 'strokes', 'dots', 'side_bet')),

  -- Scope: does this game run within a foursome or across the entire trip?
  scope text NOT NULL DEFAULT 'foursome'
    CHECK (scope IN ('foursome', 'group')),

  -- Player constraints
  min_players integer NOT NULL DEFAULT 2,
  max_players integer NOT NULL DEFAULT 20,
  team_based boolean NOT NULL DEFAULT false,

  -- Engine identifier — maps to the TypeScript engine function
  engine_key text NOT NULL UNIQUE,

  -- Default configuration (JSON) — overridable per round_game
  default_config jsonb NOT NULL DEFAULT '{}',

  -- Tier for UI ordering (1=must-have, 2=popular, 3=deep library)
  tier integer NOT NULL DEFAULT 2 CHECK (tier BETWEEN 1 AND 3),

  -- Soft delete / disable
  active boolean NOT NULL DEFAULT true,

  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. round_games — instances of games attached to a course/round
-- ---------------------------------------------------------------------------

CREATE TABLE round_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to existing tables
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  game_format_id uuid NOT NULL REFERENCES game_formats(id),

  -- Instance configuration (overrides game_formats.default_config)
  config jsonb NOT NULL DEFAULT '{}',

  -- Money
  buy_in numeric(10,2) DEFAULT 0,

  -- Status
  status text NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'active', 'finalized', 'cancelled')),

  -- Who created this game instance
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_round_games_course ON round_games(course_id);
CREATE INDEX idx_round_games_trip ON round_games(trip_id);

-- ---------------------------------------------------------------------------
-- 3. round_game_players — which players are in which game instance
-- ---------------------------------------------------------------------------

CREATE TABLE round_game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_game_id uuid NOT NULL REFERENCES round_games(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,

  -- For team-based games: which side/team within this game
  side text CHECK (side IN ('team_a', 'team_b', 'team_c', 'team_d', NULL)),

  -- For games like Wolf where role changes per hole
  metadata jsonb DEFAULT '{}',

  UNIQUE (round_game_id, trip_player_id)
);

CREATE INDEX idx_rgp_round_game ON round_game_players(round_game_id);
CREATE INDEX idx_rgp_trip_player ON round_game_players(trip_player_id);

-- ---------------------------------------------------------------------------
-- 4. game_results — computed results per player per game
-- ---------------------------------------------------------------------------

CREATE TABLE game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_game_id uuid NOT NULL REFERENCES round_games(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,

  -- Results
  position integer,
  points numeric(10,2) DEFAULT 0,
  money numeric(10,2) DEFAULT 0,

  -- Detailed breakdown (engine-specific)
  details jsonb DEFAULT '{}',

  -- When was this result last computed
  computed_at timestamptz DEFAULT now(),

  UNIQUE (round_game_id, trip_player_id)
);

CREATE INDEX idx_game_results_round_game ON game_results(round_game_id);
CREATE INDEX idx_game_results_trip_player ON game_results(trip_player_id);

-- ---------------------------------------------------------------------------
-- 5. side_bets — birdies, greenies, sandies, etc.
-- ---------------------------------------------------------------------------

CREATE TABLE side_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- What type of side bet
  bet_type text NOT NULL
    CHECK (bet_type IN ('birdie', 'eagle', 'greenie', 'sandie', 'barkie', 'chippie', 'arnie', 'custom')),

  -- Custom label (for bet_type = 'custom')
  custom_label text,

  -- Money per occurrence
  value numeric(10,2) NOT NULL DEFAULT 1,

  -- Is this active for the trip?
  active boolean NOT NULL DEFAULT true,

  created_at timestamptz DEFAULT now(),

  UNIQUE (trip_id, bet_type)
);

-- ---------------------------------------------------------------------------
-- 6. side_bet_hits — individual occurrences of side bets
-- ---------------------------------------------------------------------------

CREATE TABLE side_bet_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  side_bet_id uuid NOT NULL REFERENCES side_bets(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  hole_id uuid NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Optional: extra data (e.g., distance for greenie)
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),

  UNIQUE (side_bet_id, trip_player_id, hole_id)
);

CREATE INDEX idx_side_bet_hits_course ON side_bet_hits(course_id);
CREATE INDEX idx_side_bet_hits_player ON side_bet_hits(trip_player_id);

-- ---------------------------------------------------------------------------
-- 7. settlement_ledger — the "Bank" (running balance across trip)
-- ---------------------------------------------------------------------------

CREATE TABLE settlement_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,

  -- What generated this entry
  source_type text NOT NULL
    CHECK (source_type IN ('game_result', 'side_bet', 'expense', 'adjustment')),
  source_id uuid,

  -- The amount (positive = player receives, negative = player owes)
  amount numeric(10,2) NOT NULL,

  -- Human-readable description
  description text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_settlement_trip ON settlement_ledger(trip_id);
CREATE INDEX idx_settlement_player ON settlement_ledger(trip_player_id);
CREATE INDEX idx_settlement_source ON settlement_ledger(source_type, source_id);

-- ---------------------------------------------------------------------------
-- 8. Updated_at triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER round_games_updated_at
  BEFORE UPDATE ON round_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 9. RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE game_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_bet_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_ledger ENABLE ROW LEVEL SECURITY;

-- game_formats: public read, admin write
CREATE POLICY "Public read game_formats" ON game_formats FOR SELECT USING (true);
CREATE POLICY "Admin write game_formats" ON game_formats FOR ALL USING (auth.role() = 'authenticated');

-- round_games: public read, authenticated write
CREATE POLICY "Public read round_games" ON round_games FOR SELECT USING (true);
CREATE POLICY "Authenticated write round_games" ON round_games FOR ALL USING (auth.role() = 'authenticated');

-- round_game_players: public read, authenticated write
CREATE POLICY "Public read round_game_players" ON round_game_players FOR SELECT USING (true);
CREATE POLICY "Authenticated write round_game_players" ON round_game_players FOR ALL USING (auth.role() = 'authenticated');

-- game_results: public read, authenticated write
CREATE POLICY "Public read game_results" ON game_results FOR SELECT USING (true);
CREATE POLICY "Authenticated write game_results" ON game_results FOR ALL USING (auth.role() = 'authenticated');

-- side_bets: public read, authenticated write
CREATE POLICY "Public read side_bets" ON side_bets FOR SELECT USING (true);
CREATE POLICY "Authenticated write side_bets" ON side_bets FOR ALL USING (auth.role() = 'authenticated');

-- side_bet_hits: public read, authenticated write
CREATE POLICY "Public read side_bet_hits" ON side_bet_hits FOR SELECT USING (true);
CREATE POLICY "Authenticated write side_bet_hits" ON side_bet_hits FOR ALL USING (auth.role() = 'authenticated');

-- settlement_ledger: public read, authenticated write
CREATE POLICY "Public read settlement_ledger" ON settlement_ledger FOR SELECT USING (true);
CREATE POLICY "Authenticated write settlement_ledger" ON settlement_ledger FOR ALL USING (auth.role() = 'authenticated');

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE round_games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_results;
ALTER PUBLICATION supabase_realtime ADD TABLE side_bet_hits;
ALTER PUBLICATION supabase_realtime ADD TABLE settlement_ledger;
