-- ============================================================================
-- Migration 012: Round RSVP
-- ============================================================================

CREATE TABLE IF NOT EXISTS round_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'maybe')),

  preferred_tee text,
  preferred_time text
    CHECK (preferred_time IN ('early', 'late', 'any', null)),

  note text,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),

  UNIQUE (course_id, trip_player_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvp_course ON round_rsvps(course_id);

ALTER TABLE round_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read rsvps" ON round_rsvps FOR SELECT USING (true);

CREATE POLICY "Authenticated write rsvps" ON round_rsvps
  FOR ALL USING (auth.role() = 'authenticated');
