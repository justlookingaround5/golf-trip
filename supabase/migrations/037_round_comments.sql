CREATE TABLE round_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_key TEXT NOT NULL,  -- format: {trip_player_id}::{course_id}
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_round_comments_key ON round_comments(round_key);
ALTER TABLE round_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read" ON round_comments FOR SELECT USING (true);
CREATE POLICY "Auth users insert own" ON round_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own" ON round_comments FOR DELETE USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE round_comments;
