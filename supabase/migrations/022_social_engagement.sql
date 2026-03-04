-- ============================================================================
-- 022: Social Engagement Features
-- activity_reactions, activity_comments, push_subscriptions, trip_messages
-- ============================================================================

-- Activity Reactions
CREATE TABLE IF NOT EXISTS activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '👏', '😂', '💀', '⛳', '💰')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(activity_id, user_id, emoji)
);

CREATE INDEX idx_activity_reactions_activity ON activity_reactions(activity_id);

ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
  ON activity_reactions FOR SELECT USING (true);

CREATE POLICY "Auth users can insert own reactions"
  ON activity_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON activity_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Activity Comments
CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_comments_activity ON activity_comments(activity_id);

ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON activity_comments FOR SELECT USING (true);

CREATE POLICY "Auth users can insert own comments"
  ON activity_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON activity_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Trip Messages (Chat Wall)
CREATE TABLE IF NOT EXISTS trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_messages_trip ON trip_messages(trip_id, created_at DESC);

ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trip messages"
  ON trip_messages FOR SELECT USING (true);

CREATE POLICY "Auth users can insert own messages"
  ON trip_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON trip_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for social tables
ALTER PUBLICATION supabase_realtime ADD TABLE activity_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_messages;
