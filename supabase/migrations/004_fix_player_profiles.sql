-- Idempotent: Create player_profiles if it doesn't exist
CREATE TABLE IF NOT EXISTS player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  display_name text,
  avatar_url text,
  ghin_number text,
  handicap_index numeric(4,1),
  home_club text,
  home_club_logo_url text,
  preferred_tee text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add home_club_logo_url if table existed but column doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_profiles' AND column_name = 'home_club_logo_url'
  ) THEN
    ALTER TABLE player_profiles ADD COLUMN home_club_logo_url text;
  END IF;
END $$;

-- Updated_at trigger (drop + create for idempotency)
DROP TRIGGER IF EXISTS player_profiles_updated_at ON player_profiles;
CREATE TRIGGER player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON player_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON player_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON player_profiles;

CREATE POLICY "Public read profiles" ON player_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON player_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON player_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Recreate auth trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO player_profiles (user_id, display_name, avatar_url)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO trip_members (trip_id, user_id, role)
  SELECT id, new.id, 'owner'
  FROM trips
  WHERE created_by = new.id
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill: create profiles for existing users
INSERT INTO player_profiles (user_id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM player_profiles)
ON CONFLICT (user_id) DO NOTHING;
