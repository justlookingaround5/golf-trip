ALTER TABLE player_profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
UPDATE player_profiles SET onboarding_completed = true;
