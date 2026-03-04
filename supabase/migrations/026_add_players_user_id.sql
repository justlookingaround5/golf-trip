-- Ensure user_id column exists on players table.
-- Migration 002 defined this but it may not have been applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'players'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE players ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX idx_players_user_id ON players(user_id);
  END IF;
END
$$;
