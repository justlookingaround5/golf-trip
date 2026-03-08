-- Add per-hole stat tracking columns to scores table
ALTER TABLE scores ADD COLUMN IF NOT EXISTS fairway_hit boolean;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS gir boolean;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS putts integer CHECK (putts BETWEEN 0 AND 10);
