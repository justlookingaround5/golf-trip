-- Add settled_at timestamp to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS settled_at timestamptz;
