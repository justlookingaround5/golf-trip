-- ============================================================================
-- Migration 014: Seed Achievement Game Formats (Dots, Snake, Rabbit)
-- ============================================================================

INSERT INTO game_formats (name, description, icon, scoring_type, scope, min_players, max_players, team_based, engine_key, default_config, tier, active)
VALUES
  ('Dots / Trash', 'Earn points for greenies, sandies, barkies, polies. Lose for 3-putts, water, OB.', '🎯', 'dots', 'group', 2, 20, false, 'dots',
   '{"enabled_dots": ["greenie","sandy","barkie","polie","chippy","birdie","eagle","double","three_putt","water","ob"], "per_point_value": 1}'::jsonb, 2, true),
  ('Snake', 'Last person to 3-putt holds the snake and pays everyone.', '🐍', 'side_bet', 'group', 2, 20, false, 'snake',
   '{"snake_value": 5}'::jsonb, 2, true),
  ('Rabbit', 'Win a hole outright to grab the rabbit. Hold it at end of 9 to collect.', '🐰', 'side_bet', 'group', 2, 20, false, 'rabbit',
   '{"rabbit_value": 5, "split_nines": true, "use_net": true}'::jsonb, 2, true)
ON CONFLICT (engine_key) DO NOTHING;
