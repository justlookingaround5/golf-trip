-- Add payment handle columns to player_profiles for settlement payment links
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS venmo_username text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS cashapp_cashtag text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS zelle_email text;
