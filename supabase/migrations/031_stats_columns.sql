-- Add detailed stats columns to round_stats
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS fairways_hit integer NOT NULL DEFAULT 0;
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS fairways_total integer NOT NULL DEFAULT 0;
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS total_putts integer NOT NULL DEFAULT 0;
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS putts_per_hole numeric(4,2);
