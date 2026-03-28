-- round_likes (card-level, one per user per round)
CREATE TABLE round_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_key, user_id)
);
CREATE INDEX idx_round_likes_key ON round_likes(round_key);

ALTER TABLE round_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view round likes" ON round_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own round likes" ON round_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own round likes" ON round_likes FOR DELETE USING (auth.uid() = user_id);

ALTER publication supabase_realtime ADD TABLE round_likes;

-- round_comment_likes (one per user per comment)
CREATE TABLE round_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES round_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
CREATE INDEX idx_round_comment_likes_comment ON round_comment_likes(comment_id);

ALTER TABLE round_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comment likes" ON round_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own comment likes" ON round_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comment likes" ON round_comment_likes FOR DELETE USING (auth.uid() = user_id);

ALTER publication supabase_realtime ADD TABLE round_comment_likes;

-- Add gif_url to round_comments
ALTER TABLE round_comments ADD COLUMN gif_url TEXT;
