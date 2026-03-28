-- Add parent_id for threaded replies
ALTER TABLE round_comments ADD COLUMN parent_id UUID REFERENCES round_comments(id) ON DELETE CASCADE;
CREATE INDEX idx_round_comments_parent ON round_comments(parent_id);
