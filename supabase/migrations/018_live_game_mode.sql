-- Round-based scores for Live Game Mode
CREATE TABLE round_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_player_id uuid NOT NULL REFERENCES trip_players(id) ON DELETE CASCADE,
  hole_id uuid NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  gross_score integer NOT NULL CHECK (gross_score BETWEEN 1 AND 20),
  entered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (course_id, trip_player_id, hole_id)
);

CREATE INDEX idx_round_scores_course ON round_scores(course_id);
CREATE INDEX idx_round_scores_player ON round_scores(trip_player_id);
ALTER PUBLICATION supabase_realtime ADD TABLE round_scores;
ALTER TABLE round_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON round_scores FOR SELECT USING (true);
CREATE POLICY "Auth write" ON round_scores FOR ALL USING (auth.role() = 'authenticated');

-- Yardage per hole (JSON: {"White": 345, "Blue": 372})
ALTER TABLE holes ADD COLUMN IF NOT EXISTS yardage jsonb DEFAULT '{}';

-- Link to GolfCourseAPI for yardage lookups
ALTER TABLE courses ADD COLUMN IF NOT EXISTS golf_course_api_id integer;
