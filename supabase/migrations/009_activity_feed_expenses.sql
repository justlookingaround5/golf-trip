-- ============================================================================
-- Migration 009: Activity Feed + Expenses
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Activity feed — real-time event log for trips
-- ---------------------------------------------------------------------------

CREATE TABLE activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  event_type text NOT NULL CHECK (event_type IN (
    'score_posted', 'birdie', 'eagle', 'skin_won',
    'game_result', 'lead_change', 'press', 'side_bet_hit',
    'photo', 'round_started', 'round_finalized',
    'player_joined', 'expense_added', 'custom'
  )),

  -- Who triggered this event (null for system events)
  trip_player_id uuid REFERENCES trip_players(id) ON DELETE SET NULL,

  -- Context references
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  hole_id uuid REFERENCES holes(id) ON DELETE SET NULL,
  round_game_id uuid REFERENCES round_games(id) ON DELETE SET NULL,

  -- Display content
  title text NOT NULL,
  detail text,
  icon text DEFAULT '⛳',
  photo_url text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_feed_trip ON activity_feed(trip_id, created_at DESC);
CREATE INDEX idx_activity_feed_type ON activity_feed(event_type);

ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read activity_feed" ON activity_feed FOR SELECT USING (true);
CREATE POLICY "Authenticated write activity_feed" ON activity_feed FOR ALL USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 2. Expenses — non-golf costs split across players
-- ---------------------------------------------------------------------------

CREATE TABLE trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  description text NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('lodging', 'food', 'transport', 'golf', 'entertainment', 'other')),
  amount numeric(10,2) NOT NULL,

  paid_by_trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,

  -- null = split evenly among all trip players
  split_among jsonb,

  split_method text NOT NULL DEFAULT 'even'
    CHECK (split_method IN ('even', 'custom')),

  -- Only used if split_method = 'custom': { "trip_player_id": amount, ... }
  custom_splits jsonb,

  receipt_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_expenses_trip ON trip_expenses(trip_id);

ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trip_expenses" ON trip_expenses FOR SELECT USING (true);
CREATE POLICY "Authenticated write trip_expenses" ON trip_expenses FOR ALL USING (auth.role() = 'authenticated');
