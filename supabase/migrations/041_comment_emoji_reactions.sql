-- Add emoji column to round_comment_likes
ALTER TABLE round_comment_likes ADD COLUMN emoji TEXT NOT NULL DEFAULT '🔥';

-- Drop old unique constraint (one like per user per comment)
ALTER TABLE round_comment_likes DROP CONSTRAINT round_comment_likes_comment_id_user_id_key;

-- Add new unique constraint (one reaction per emoji per user per comment)
ALTER TABLE round_comment_likes ADD CONSTRAINT round_comment_likes_comment_id_user_id_emoji_key UNIQUE(comment_id, user_id, emoji);

-- Restrict to allowed emoji set
ALTER TABLE round_comment_likes ADD CONSTRAINT round_comment_likes_emoji_check CHECK (emoji IN ('🔥', '👏', '😂', '💀', '⛳', '💰'));
