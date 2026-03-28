ALTER TABLE courses ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tee_boxes jsonb;
