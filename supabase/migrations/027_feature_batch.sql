-- 027_feature_batch.sql
-- Feature batch for Andrew's 10 feature requests

-- Item 1: Trip handicap mode (static vs dynamic GHIN)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS handicap_mode text DEFAULT 'static'
  CHECK (handicap_mode IN ('static', 'dynamic'));

-- Item 2: 20-Ball game format
INSERT INTO game_formats (name, description, rules_summary, icon, scoring_type, scope,
  min_players, max_players, team_based, engine_key, default_config, tier)
VALUES ('20-Ball', '2-player game: lock in exactly 20 net scores across both players.',
  'Each player locks in 8-12 holes. Lowest combined net wins.', '🎱',
  'strokes', 'foursome', 2, 2, false, 'twenty_ball',
  '{"min_holes_per_player":8,"max_holes_per_player":12,"total_locks":20}', 2)
ON CONFLICT DO NOTHING;

-- Item 8: Hole stats (fairway, GIR, putts)
ALTER TABLE round_scores ADD COLUMN IF NOT EXISTS fairway_hit boolean;
ALTER TABLE round_scores ADD COLUMN IF NOT EXISTS gir boolean;
ALTER TABLE round_scores ADD COLUMN IF NOT EXISTS putts integer CHECK (putts >= 0 AND putts <= 10);

-- Item 9: System messages in chat
ALTER TABLE trip_messages ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;
ALTER TABLE trip_messages ALTER COLUMN user_id DROP NOT NULL;

-- Item 10: Round-level format defaults
ALTER TABLE courses ADD COLUMN IF NOT EXISTS default_match_format text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS default_point_value numeric(4,1);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS format_config jsonb;
