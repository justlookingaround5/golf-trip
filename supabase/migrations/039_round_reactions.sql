-- Add emoji column to round_likes for Slack-style reactions
ALTER TABLE round_likes ADD COLUMN emoji TEXT NOT NULL DEFAULT '🔥';

-- Drop old unique constraint (one like per user per round)
ALTER TABLE round_likes DROP CONSTRAINT round_likes_round_key_user_id_key;

-- Add new unique constraint (one reaction per emoji per user per round)
ALTER TABLE round_likes ADD CONSTRAINT round_likes_round_key_user_id_emoji_key UNIQUE(round_key, user_id, emoji);

-- Restrict to allowed emoji set
ALTER TABLE round_likes ADD CONSTRAINT round_likes_emoji_check CHECK (emoji IN ('🔥', '👏', '😂', '💀', '⛳', '💰'));
