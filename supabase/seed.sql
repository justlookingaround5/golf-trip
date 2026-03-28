-- ============================================================================
-- supabase/seed.sql — Monterey Cup 2025
-- 16 players, 2 teams, 4 rounds, 16 matches
--
-- UUID reference (all hex-valid):
--   Auth users:    11111111-...-111111111111  (Andrew)  thru  aaaa7777-...-777777777777
--   Players:       a1000001-0000-4000-a000-000000000001  thru  ...000000000010
--   Trip players:  b0000001-0000-4000-a000-000000000001  thru  ...000000000010
--   Trip:          aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa
--   Courses:       cccc0001-cccc-4ccc-accc-cccccccccccc  thru  ...0004
--   Holes:         c001000X  thru  c004000X  (X = hole 01–12 hex)
--   Teams:         d0001111-1111-4111-a111-111111111111  (Nicklaus)
--                  d0002222-2222-4222-a222-222222222222  (Palmer)
--   Matches:       e0000001-0000-4000-a000-000000000001  thru  ...000000000010
--   Round games:   f0000001-...-000000000001  thru  ...000000000004
--   Side bets:     f1000001-...-000000000001  thru  ...000000000005
--   Competition:   f2000001-0000-4000-a000-000000000001
--   Sessions:      f3000001-...  thru  f3000004-...
--   Comp matches:  f4000001-...  thru  f4000010-...
--   Group:         f5000001-0000-4000-a000-000000000001
--   Expenses:      f6000001-...  thru  f6000003-...
--   Wallets:       f9000001-...  thru  f9000006-...
--
-- Verification:
--   SELECT count(*) FROM auth.users;       -- 16
--   SELECT count(*) FROM trip_players;     -- 16
--   SELECT count(*) FROM matches;          -- 16
--   SELECT count(*) FROM round_scores;     -- ~1004
--   SELECT count(*) FROM round_stats;      -- 48
-- ============================================================================

-- ============================================================================
-- 0. DELETE (reverse FK order)
-- ============================================================================
DELETE FROM activity_comments;
DELETE FROM activity_reactions;
DELETE FROM activity_feed;
DELETE FROM trip_messages;
DELETE FROM friendships;
DELETE FROM scorecard_preferences;
DELETE FROM trip_awards;
DELETE FROM trip_stats;
DELETE FROM round_stats;
DELETE FROM round_scores;
DELETE FROM scores;
DELETE FROM match_players;
DELETE FROM matches;
DELETE FROM competition_matches;
DELETE FROM competition_sessions;
DELETE FROM trip_competitions;
DELETE FROM game_results;
DELETE FROM round_game_players;
DELETE FROM round_games;
-- game_formats left alone (idempotent upsert below)
DELETE FROM settlement_ledger;
DELETE FROM wallet_transactions;
DELETE FROM player_wallets;
DELETE FROM round_rsvps;
DELETE FROM player_round_tees;
DELETE FROM player_course_handicaps;
DELETE FROM team_players;
DELETE FROM teams;
DELETE FROM trip_members;
DELETE FROM trip_invites;
DELETE FROM trip_players;
DELETE FROM holes;
DELETE FROM courses;
DELETE FROM course_vote_responses;
DELETE FROM course_votes;
DELETE FROM date_poll_responses;
DELETE FROM date_polls;
DELETE FROM trips;
DELETE FROM group_members;
DELETE FROM groups;
DELETE FROM players;
DELETE FROM push_subscriptions;
DELETE FROM player_profiles;
DELETE FROM auth.users;

-- ============================================================================
-- 1. AUTH USERS (16)
--    handle_new_user trigger auto-creates player_profiles.
-- ============================================================================
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, aud, role
) VALUES
  -- Team Nicklaus
  ('11111111-1111-1111-1111-111111111111', 'andrew@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Andrew Mitchell"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'jake@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Jake Reynolds"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'mike@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Mike Thompson"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'tom@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Tom Bradley"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'griffin@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Griffin Cole"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'danny@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Danny Park"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('77777777-7777-7777-7777-777777777777', 'chris@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Chris Lawson"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('88888888-8888-8888-8888-888888888888', 'ryan@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Ryan Stafford"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  -- Team Palmer
  ('99999999-9999-9999-9999-999999999999', 'matt@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Matt Sullivan"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('aaaa1111-1111-4111-a111-111111111111', 'tyler@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Tyler Brooks"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('aaaa2222-2222-4222-a222-222222222222', 'zach@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Zach Morgan"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('aaaa3333-3333-4333-a333-333333333333', 'logan@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Logan Pierce"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('aaaa4444-4444-4444-a444-444444444444', 'derek@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Derek Owens"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('aaaa5555-5555-4555-a555-555555555555', 'sean@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Sean Baxter"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('aaaa6666-6666-4666-a666-666666666666', 'kevin@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Kevin Hart"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('aaaa7777-7777-4777-a777-777777777777', 'brett@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Brett Davis"}'::jsonb, now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. PLAYER PROFILES UPDATE
-- ============================================================================
UPDATE player_profiles SET handicap_index=4.2,  home_club='Pebble Beach Golf Links', preferred_tee='White', bio='Low handicapper. Loves links golf.', venmo_username='andrewmitch', location='San Francisco, California' WHERE user_id='11111111-1111-1111-1111-111111111111';
UPDATE player_profiles SET handicap_index=8.1,  home_club='Cypress Point Club',      preferred_tee='White', location='Monterey, California'       WHERE user_id='22222222-2222-2222-2222-222222222222';
UPDATE player_profiles SET handicap_index=6.5,  home_club='Olympic Club',            preferred_tee='White', location='San Francisco, California'   WHERE user_id='33333333-3333-3333-3333-333333333333';
UPDATE player_profiles SET handicap_index=10.3, home_club='Monterey Peninsula CC',   preferred_tee='White', location='Monterey, California'       WHERE user_id='44444444-4444-4444-4444-444444444444';
UPDATE player_profiles SET handicap_index=12.8, home_club='Pasatiempo GC',           preferred_tee='Blue',  location='Santa Cruz, California'     WHERE user_id='55555555-5555-5555-5555-555555555555';
UPDATE player_profiles SET handicap_index=14.2, home_club='Half Moon Bay GL',        preferred_tee='Blue',  location='Half Moon Bay, California'  WHERE user_id='66666666-6666-6666-6666-666666666666';
UPDATE player_profiles SET handicap_index=5.9,  home_club='San Francisco GC',        preferred_tee='White', location='San Francisco, California'   WHERE user_id='77777777-7777-7777-7777-777777777777';
UPDATE player_profiles SET handicap_index=16.5, home_club='Bayonet Black Horse',     preferred_tee='Blue',  location='Seaside, California'        WHERE user_id='88888888-8888-8888-8888-888888888888';
UPDATE player_profiles SET handicap_index=7.4,  home_club='TPC Harding Park',        preferred_tee='White', location='San Francisco, California'   WHERE user_id='99999999-9999-9999-9999-999999999999';
UPDATE player_profiles SET handicap_index=11.6, home_club='Spyglass Hill GC',        preferred_tee='Blue',  location='Pebble Beach, California'   WHERE user_id='aaaa1111-1111-4111-a111-111111111111';
UPDATE player_profiles SET handicap_index=9.8,  home_club='Poppy Hills GC',          preferred_tee='White', location='Pebble Beach, California'   WHERE user_id='aaaa2222-2222-4222-a222-222222222222';
UPDATE player_profiles SET handicap_index=17.1, home_club='Pacific Grove GL',        preferred_tee='Blue',  location='Pacific Grove, California'  WHERE user_id='aaaa3333-3333-4333-a333-333333333333';
UPDATE player_profiles SET handicap_index=13.5, home_club='Corral de Tierra CC',     preferred_tee='Blue',  location='Salinas, California'        WHERE user_id='aaaa4444-4444-4444-a444-444444444444';
UPDATE player_profiles SET handicap_index=15.8, home_club='Quail Lodge GC',          preferred_tee='Blue',  location='Carmel, California'         WHERE user_id='aaaa5555-5555-4555-a555-555555555555';
UPDATE player_profiles SET handicap_index=8.7,  home_club='Carmel Valley Ranch',     preferred_tee='White', location='Carmel Valley, California'  WHERE user_id='aaaa6666-6666-4666-a666-666666666666';
UPDATE player_profiles SET handicap_index=19.4, home_club='Del Monte GC',            preferred_tee='Blue',  location='Monterey, California'       WHERE user_id='aaaa7777-7777-4777-a777-777777777777';

-- ============================================================================
-- 3. PLAYERS (16, all linked to auth users)
-- ============================================================================
INSERT INTO players (id, name, email, handicap_index, user_id) VALUES
  ('a1000001-0000-4000-a000-000000000001', 'Andrew Mitchell', 'andrew@forelive.test', 4.2,  '11111111-1111-1111-1111-111111111111'),
  ('a1000002-0000-4000-a000-000000000002', 'Jake Reynolds',   'jake@forelive.test',   8.1,  '22222222-2222-2222-2222-222222222222'),
  ('a1000003-0000-4000-a000-000000000003', 'Mike Thompson',   'mike@forelive.test',   6.5,  '33333333-3333-3333-3333-333333333333'),
  ('a1000004-0000-4000-a000-000000000004', 'Tom Bradley',     'tom@forelive.test',    10.3, '44444444-4444-4444-4444-444444444444'),
  ('a1000005-0000-4000-a000-000000000005', 'Griffin Cole',    'griffin@forelive.test', 12.8, '55555555-5555-5555-5555-555555555555'),
  ('a1000006-0000-4000-a000-000000000006', 'Danny Park',      'danny@forelive.test',  14.2, '66666666-6666-6666-6666-666666666666'),
  ('a1000007-0000-4000-a000-000000000007', 'Chris Lawson',    'chris@forelive.test',  5.9,  '77777777-7777-7777-7777-777777777777'),
  ('a1000008-0000-4000-a000-000000000008', 'Ryan Stafford',   'ryan@forelive.test',   16.5, '88888888-8888-8888-8888-888888888888'),
  ('a1000009-0000-4000-a000-000000000009', 'Matt Sullivan',   'matt@forelive.test',   7.4,  '99999999-9999-9999-9999-999999999999'),
  ('a100000a-0000-4000-a000-00000000000a', 'Tyler Brooks',    'tyler@forelive.test',  11.6, 'aaaa1111-1111-4111-a111-111111111111'),
  ('a100000b-0000-4000-a000-00000000000b', 'Zach Morgan',     'zach@forelive.test',   9.8,  'aaaa2222-2222-4222-a222-222222222222'),
  ('a100000c-0000-4000-a000-00000000000c', 'Logan Pierce',    'logan@forelive.test',  17.1, 'aaaa3333-3333-4333-a333-333333333333'),
  ('a100000d-0000-4000-a000-00000000000d', 'Derek Owens',     'derek@forelive.test',  13.5, 'aaaa4444-4444-4444-a444-444444444444'),
  ('a100000e-0000-4000-a000-00000000000e', 'Sean Baxter',     'sean@forelive.test',   15.8, 'aaaa5555-5555-4555-a555-555555555555'),
  ('a100000f-0000-4000-a000-00000000000f', 'Kevin Hart',      'kevin@forelive.test',  8.7,  'aaaa6666-6666-4666-a666-666666666666'),
  ('a1000010-0000-4000-a000-000000000010', 'Brett Davis',     'brett@forelive.test',  19.4, 'aaaa7777-7777-4777-a777-777777777777')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. GROUPS + GROUP MEMBERS
-- ============================================================================
INSERT INTO groups (id, name, description, created_by) VALUES
  ('f5000001-0000-4000-a000-000000000001', 'Monterey Boys',
   'Annual golf trip crew — 16 strong', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO group_members (id, group_id, user_id, role) VALUES
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '22222222-2222-2222-2222-222222222222', 'admin'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '33333333-3333-3333-3333-333333333333', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '44444444-4444-4444-4444-444444444444', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '55555555-5555-5555-5555-555555555555', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '66666666-6666-6666-6666-666666666666', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '77777777-7777-7777-7777-777777777777', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '88888888-8888-8888-8888-888888888888', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', '99999999-9999-9999-9999-999999999999', 'admin'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', 'aaaa1111-1111-4111-a111-111111111111', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', 'aaaa2222-2222-4222-a222-222222222222', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', 'aaaa3333-3333-4333-a333-333333333333', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', 'aaaa4444-4444-4444-a444-444444444444', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', 'aaaa5555-5555-4555-a555-555555555555', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', 'aaaa6666-6666-4666-a666-666666666666', 'member'),
  (gen_random_uuid(), 'f5000001-0000-4000-a000-000000000001', 'aaaa7777-7777-4777-a777-777777777777', 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ============================================================================
-- 5. TRIPS + TRIP MEMBERS
-- ============================================================================
INSERT INTO trips (id, name, year, location, status, match_buy_in, skins_buy_in, skins_mode, group_id, handicap_mode, created_by) VALUES
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'Monterey Cup 2025', 2025, 'Monterey Peninsula, CA',
   'active', 100.00, 10.00, 'net', 'f5000001-0000-4000-a000-000000000001', 'static',
   '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO trip_members (id, trip_id, user_id, role) VALUES
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'admin'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'aaaa1111-1111-4111-a111-111111111111', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'aaaa2222-2222-4222-a222-222222222222', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'aaaa3333-3333-4333-a333-333333333333', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'aaaa4444-4444-4444-a444-444444444444', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'aaaa5555-5555-4555-a555-555555555555', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'aaaa6666-6666-4666-a666-666666666666', 'player'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'aaaa7777-7777-4777-a777-777777777777', 'player')
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================================================
-- 6. COURSES (4 rounds)
-- ============================================================================
INSERT INTO courses (id, trip_id, name, slope, rating, par, round_number, round_date, latitude, longitude) VALUES
  ('cccc0001-cccc-4ccc-accc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   'Pebble Beach Golf Links', 144, 72.0, 72, 1, '2025-06-12', 36.5668, -121.9487),
  ('cccc0002-cccc-4ccc-accc-cccccccccccd', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   'Spyglass Hill Golf Course', 143, 73.1, 72, 2, '2025-06-13', 36.5830, -121.9500),
  ('cccc0003-cccc-4ccc-accc-ccccccccccce', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   'Cypress Point Club', 141, 71.5, 72, 3, '2025-06-14', 36.5800, -121.9667),
  ('cccc0004-cccc-4ccc-accc-cccccccccccf', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   'Poppy Hills Golf Course', 135, 70.2, 72, 4, '2025-06-15', 36.5870, -121.9470)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. HOLES (4 x 18 = 72)
-- ============================================================================

-- Pebble Beach (par 72)
INSERT INTO holes (id, course_id, hole_number, par, handicap_index, yardage) VALUES
  ('c0010001-0000-4000-a000-000000000001','cccc0001-cccc-4ccc-accc-cccccccccccc', 1, 4, 7, '{"Blue":381,"White":357,"Gold":331}'),
  ('c0010002-0000-4000-a000-000000000002','cccc0001-cccc-4ccc-accc-cccccccccccc', 2, 5,11, '{"Blue":502,"White":474,"Gold":449}'),
  ('c0010003-0000-4000-a000-000000000003','cccc0001-cccc-4ccc-accc-cccccccccccc', 3, 4,15, '{"Blue":388,"White":366,"Gold":340}'),
  ('c0010004-0000-4000-a000-000000000004','cccc0001-cccc-4ccc-accc-cccccccccccc', 4, 4, 5, '{"Blue":331,"White":307,"Gold":284}'),
  ('c0010005-0000-4000-a000-000000000005','cccc0001-cccc-4ccc-accc-cccccccccccc', 5, 3,13, '{"Blue":188,"White":166,"Gold":143}'),
  ('c0010006-0000-4000-a000-000000000006','cccc0001-cccc-4ccc-accc-cccccccccccc', 6, 5, 1, '{"Blue":523,"White":492,"Gold":460}'),
  ('c0010007-0000-4000-a000-000000000007','cccc0001-cccc-4ccc-accc-cccccccccccc', 7, 3,17, '{"Blue":106,"White":98,"Gold":89}'),
  ('c0010008-0000-4000-a000-000000000008','cccc0001-cccc-4ccc-accc-cccccccccccc', 8, 4, 3, '{"Blue":428,"White":399,"Gold":370}'),
  ('c0010009-0000-4000-a000-000000000009','cccc0001-cccc-4ccc-accc-cccccccccccc', 9, 4, 9, '{"Blue":505,"White":480,"Gold":452}'),
  ('c001000a-0000-4000-a000-00000000000a','cccc0001-cccc-4ccc-accc-cccccccccccc',10, 4, 6, '{"Blue":446,"White":421,"Gold":395}'),
  ('c001000b-0000-4000-a000-00000000000b','cccc0001-cccc-4ccc-accc-cccccccccccc',11, 4,14, '{"Blue":390,"White":370,"Gold":347}'),
  ('c001000c-0000-4000-a000-00000000000c','cccc0001-cccc-4ccc-accc-cccccccccccc',12, 3,16, '{"Blue":202,"White":183,"Gold":162}'),
  ('c001000d-0000-4000-a000-00000000000d','cccc0001-cccc-4ccc-accc-cccccccccccc',13, 4, 4, '{"Blue":445,"White":415,"Gold":388}'),
  ('c001000e-0000-4000-a000-00000000000e','cccc0001-cccc-4ccc-accc-cccccccccccc',14, 5, 2, '{"Blue":580,"White":543,"Gold":510}'),
  ('c001000f-0000-4000-a000-00000000000f','cccc0001-cccc-4ccc-accc-cccccccccccc',15, 4, 8, '{"Blue":397,"White":375,"Gold":350}'),
  ('c0010010-0000-4000-a000-000000000010','cccc0001-cccc-4ccc-accc-cccccccccccc',16, 4,18, '{"Blue":178,"White":163,"Gold":143}'),
  ('c0010011-0000-4000-a000-000000000011','cccc0001-cccc-4ccc-accc-cccccccccccc',17, 3,12, '{"Blue":178,"White":163,"Gold":146}'),
  ('c0010012-0000-4000-a000-000000000012','cccc0001-cccc-4ccc-accc-cccccccccccc',18, 5,10, '{"Blue":543,"White":513,"Gold":480}');

-- Spyglass Hill (par 72)
INSERT INTO holes (id, course_id, hole_number, par, handicap_index, yardage) VALUES
  ('c0020001-0000-4000-a000-000000000001','cccc0002-cccc-4ccc-accc-cccccccccccd', 1, 5, 5, '{"Blue":595,"White":558,"Gold":525}'),
  ('c0020002-0000-4000-a000-000000000002','cccc0002-cccc-4ccc-accc-cccccccccccd', 2, 4, 7, '{"Blue":349,"White":328,"Gold":303}'),
  ('c0020003-0000-4000-a000-000000000003','cccc0002-cccc-4ccc-accc-cccccccccccd', 3, 3,15, '{"Blue":152,"White":137,"Gold":119}'),
  ('c0020004-0000-4000-a000-000000000004','cccc0002-cccc-4ccc-accc-cccccccccccd', 4, 4, 1, '{"Blue":370,"White":352,"Gold":330}'),
  ('c0020005-0000-4000-a000-000000000005','cccc0002-cccc-4ccc-accc-cccccccccccd', 5, 4, 3, '{"Blue":408,"White":385,"Gold":360}'),
  ('c0020006-0000-4000-a000-000000000006','cccc0002-cccc-4ccc-accc-cccccccccccd', 6, 4,11, '{"Blue":446,"White":418,"Gold":390}'),
  ('c0020007-0000-4000-a000-000000000007','cccc0002-cccc-4ccc-accc-cccccccccccd', 7, 5, 9, '{"Blue":529,"White":500,"Gold":470}'),
  ('c0020008-0000-4000-a000-000000000008','cccc0002-cccc-4ccc-accc-cccccccccccd', 8, 4,13, '{"Blue":399,"White":376,"Gold":349}'),
  ('c0020009-0000-4000-a000-000000000009','cccc0002-cccc-4ccc-accc-cccccccccccd', 9, 3,17, '{"Blue":176,"White":159,"Gold":138}'),
  ('c002000a-0000-4000-a000-00000000000a','cccc0002-cccc-4ccc-accc-cccccccccccd',10, 4, 6, '{"Blue":407,"White":383,"Gold":357}'),
  ('c002000b-0000-4000-a000-00000000000b','cccc0002-cccc-4ccc-accc-cccccccccccd',11, 5, 4, '{"Blue":528,"White":505,"Gold":475}'),
  ('c002000c-0000-4000-a000-00000000000c','cccc0002-cccc-4ccc-accc-cccccccccccd',12, 3,16, '{"Blue":178,"White":162,"Gold":140}'),
  ('c002000d-0000-4000-a000-00000000000d','cccc0002-cccc-4ccc-accc-cccccccccccd',13, 4, 2, '{"Blue":435,"White":412,"Gold":385}'),
  ('c002000e-0000-4000-a000-00000000000e','cccc0002-cccc-4ccc-accc-cccccccccccd',14, 5, 8, '{"Blue":560,"White":530,"Gold":498}'),
  ('c002000f-0000-4000-a000-00000000000f','cccc0002-cccc-4ccc-accc-cccccccccccd',15, 3,18, '{"Blue":130,"White":115,"Gold":100}'),
  ('c0020010-0000-4000-a000-000000000010','cccc0002-cccc-4ccc-accc-cccccccccccd',16, 4,10, '{"Blue":376,"White":353,"Gold":328}'),
  ('c0020011-0000-4000-a000-000000000011','cccc0002-cccc-4ccc-accc-cccccccccccd',17, 4,12, '{"Blue":325,"White":305,"Gold":280}'),
  ('c0020012-0000-4000-a000-000000000012','cccc0002-cccc-4ccc-accc-cccccccccccd',18, 4,14, '{"Blue":408,"White":382,"Gold":355}');

-- Cypress Point (par 72)
INSERT INTO holes (id, course_id, hole_number, par, handicap_index, yardage) VALUES
  ('c0030001-0000-4000-a000-000000000001','cccc0003-cccc-4ccc-accc-ccccccccccce', 1, 4, 9, '{"Blue":421,"White":396,"Gold":370}'),
  ('c0030002-0000-4000-a000-000000000002','cccc0003-cccc-4ccc-accc-ccccccccccce', 2, 5, 3, '{"Blue":548,"White":520,"Gold":490}'),
  ('c0030003-0000-4000-a000-000000000003','cccc0003-cccc-4ccc-accc-ccccccccccce', 3, 3,15, '{"Blue":162,"White":148,"Gold":130}'),
  ('c0030004-0000-4000-a000-000000000004','cccc0003-cccc-4ccc-accc-ccccccccccce', 4, 4, 1, '{"Blue":384,"White":363,"Gold":340}'),
  ('c0030005-0000-4000-a000-000000000005','cccc0003-cccc-4ccc-accc-ccccccccccce', 5, 5, 7, '{"Blue":493,"White":468,"Gold":440}'),
  ('c0030006-0000-4000-a000-000000000006','cccc0003-cccc-4ccc-accc-ccccccccccce', 6, 4,11, '{"Blue":437,"White":412,"Gold":385}'),
  ('c0030007-0000-4000-a000-000000000007','cccc0003-cccc-4ccc-accc-ccccccccccce', 7, 3,17, '{"Blue":168,"White":152,"Gold":132}'),
  ('c0030008-0000-4000-a000-000000000008','cccc0003-cccc-4ccc-accc-ccccccccccce', 8, 4, 5, '{"Blue":363,"White":340,"Gold":315}'),
  ('c0030009-0000-4000-a000-000000000009','cccc0003-cccc-4ccc-accc-ccccccccccce', 9, 4,13, '{"Blue":292,"White":273,"Gold":252}'),
  ('c003000a-0000-4000-a000-00000000000a','cccc0003-cccc-4ccc-accc-ccccccccccce',10, 4, 4, '{"Blue":480,"White":455,"Gold":428}'),
  ('c003000b-0000-4000-a000-00000000000b','cccc0003-cccc-4ccc-accc-ccccccccccce',11, 4,14, '{"Blue":437,"White":412,"Gold":385}'),
  ('c003000c-0000-4000-a000-00000000000c','cccc0003-cccc-4ccc-accc-ccccccccccce',12, 3,18, '{"Blue":155,"White":140,"Gold":120}'),
  ('c003000d-0000-4000-a000-00000000000d','cccc0003-cccc-4ccc-accc-ccccccccccce',13, 4, 6, '{"Blue":365,"White":345,"Gold":320}'),
  ('c003000e-0000-4000-a000-00000000000e','cccc0003-cccc-4ccc-accc-ccccccccccce',14, 3,16, '{"Blue":135,"White":122,"Gold":108}'),
  ('c003000f-0000-4000-a000-00000000000f','cccc0003-cccc-4ccc-accc-ccccccccccce',15, 4, 2, '{"Blue":390,"White":368,"Gold":343}'),
  ('c0030010-0000-4000-a000-000000000010','cccc0003-cccc-4ccc-accc-ccccccccccce',16, 5, 8, '{"Blue":518,"White":490,"Gold":460}'),
  ('c0030011-0000-4000-a000-000000000011','cccc0003-cccc-4ccc-accc-ccccccccccce',17, 4,10, '{"Blue":393,"White":370,"Gold":345}'),
  ('c0030012-0000-4000-a000-000000000012','cccc0003-cccc-4ccc-accc-ccccccccccce',18, 5,12, '{"Blue":540,"White":510,"Gold":478}');

-- Poppy Hills (par 72)
INSERT INTO holes (id, course_id, hole_number, par, handicap_index, yardage) VALUES
  ('c0040001-0000-4000-a000-000000000001','cccc0004-cccc-4ccc-accc-cccccccccccf', 1, 4, 7, '{"Blue":395,"White":372,"Gold":348}'),
  ('c0040002-0000-4000-a000-000000000002','cccc0004-cccc-4ccc-accc-cccccccccccf', 2, 3,15, '{"Blue":182,"White":165,"Gold":145}'),
  ('c0040003-0000-4000-a000-000000000003','cccc0004-cccc-4ccc-accc-cccccccccccf', 3, 4, 3, '{"Blue":415,"White":390,"Gold":365}'),
  ('c0040004-0000-4000-a000-000000000004','cccc0004-cccc-4ccc-accc-cccccccccccf', 4, 5,11, '{"Blue":535,"White":505,"Gold":475}'),
  ('c0040005-0000-4000-a000-000000000005','cccc0004-cccc-4ccc-accc-cccccccccccf', 5, 4, 1, '{"Blue":440,"White":415,"Gold":388}'),
  ('c0040006-0000-4000-a000-000000000006','cccc0004-cccc-4ccc-accc-cccccccccccf', 6, 3,17, '{"Blue":155,"White":140,"Gold":122}'),
  ('c0040007-0000-4000-a000-000000000007','cccc0004-cccc-4ccc-accc-cccccccccccf', 7, 4, 9, '{"Blue":380,"White":358,"Gold":332}'),
  ('c0040008-0000-4000-a000-000000000008','cccc0004-cccc-4ccc-accc-cccccccccccf', 8, 5, 5, '{"Blue":560,"White":530,"Gold":498}'),
  ('c0040009-0000-4000-a000-000000000009','cccc0004-cccc-4ccc-accc-cccccccccccf', 9, 4,13, '{"Blue":348,"White":325,"Gold":300}'),
  ('c004000a-0000-4000-a000-00000000000a','cccc0004-cccc-4ccc-accc-cccccccccccf',10, 4, 2, '{"Blue":430,"White":405,"Gold":378}'),
  ('c004000b-0000-4000-a000-00000000000b','cccc0004-cccc-4ccc-accc-cccccccccccf',11, 3,16, '{"Blue":170,"White":155,"Gold":135}'),
  ('c004000c-0000-4000-a000-00000000000c','cccc0004-cccc-4ccc-accc-cccccccccccf',12, 5, 6, '{"Blue":520,"White":492,"Gold":462}'),
  ('c004000d-0000-4000-a000-00000000000d','cccc0004-cccc-4ccc-accc-cccccccccccf',13, 4,10, '{"Blue":375,"White":352,"Gold":325}'),
  ('c004000e-0000-4000-a000-00000000000e','cccc0004-cccc-4ccc-accc-cccccccccccf',14, 4, 4, '{"Blue":445,"White":420,"Gold":392}'),
  ('c004000f-0000-4000-a000-00000000000f','cccc0004-cccc-4ccc-accc-cccccccccccf',15, 3,18, '{"Blue":148,"White":132,"Gold":115}'),
  ('c0040010-0000-4000-a000-000000000010','cccc0004-cccc-4ccc-accc-cccccccccccf',16, 4, 8, '{"Blue":388,"White":365,"Gold":340}'),
  ('c0040011-0000-4000-a000-000000000011','cccc0004-cccc-4ccc-accc-cccccccccccf',17, 5,12, '{"Blue":545,"White":515,"Gold":482}'),
  ('c0040012-0000-4000-a000-000000000012','cccc0004-cccc-4ccc-accc-cccccccccccf',18, 4,14, '{"Blue":405,"White":380,"Gold":355}');

-- ============================================================================
-- 8. TRIP PLAYERS (16)
-- ============================================================================
INSERT INTO trip_players (id, trip_id, player_id, paid) VALUES
  ('b0000001-0000-4000-a000-000000000001','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000001-0000-4000-a000-000000000001', true),
  ('b0000002-0000-4000-a000-000000000002','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000002-0000-4000-a000-000000000002', true),
  ('b0000003-0000-4000-a000-000000000003','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000003-0000-4000-a000-000000000003', true),
  ('b0000004-0000-4000-a000-000000000004','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000004-0000-4000-a000-000000000004', true),
  ('b0000005-0000-4000-a000-000000000005','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000005-0000-4000-a000-000000000005', true),
  ('b0000006-0000-4000-a000-000000000006','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000006-0000-4000-a000-000000000006', true),
  ('b0000007-0000-4000-a000-000000000007','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000007-0000-4000-a000-000000000007', true),
  ('b0000008-0000-4000-a000-000000000008','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000008-0000-4000-a000-000000000008', true),
  ('b0000009-0000-4000-a000-000000000009','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000009-0000-4000-a000-000000000009', true),
  ('b000000a-0000-4000-a000-00000000000a','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a100000a-0000-4000-a000-00000000000a', true),
  ('b000000b-0000-4000-a000-00000000000b','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a100000b-0000-4000-a000-00000000000b', true),
  ('b000000c-0000-4000-a000-00000000000c','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a100000c-0000-4000-a000-00000000000c', true),
  ('b000000d-0000-4000-a000-00000000000d','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a100000d-0000-4000-a000-00000000000d', true),
  ('b000000e-0000-4000-a000-00000000000e','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a100000e-0000-4000-a000-00000000000e', true),
  ('b000000f-0000-4000-a000-00000000000f','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a100000f-0000-4000-a000-00000000000f', true),
  ('b0000010-0000-4000-a000-000000000010','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','a1000010-0000-4000-a000-000000000010', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. PLAYER COURSE HANDICAPS (16 x 4 = 64)
-- ============================================================================
INSERT INTO player_course_handicaps (id, trip_player_id, course_id, handicap_strokes) VALUES
  -- Pebble Beach (slope 144, rating 72.0)
  (gen_random_uuid(),'b0000001-0000-4000-a000-000000000001','cccc0001-cccc-4ccc-accc-cccccccccccc', 5),
  (gen_random_uuid(),'b0000002-0000-4000-a000-000000000002','cccc0001-cccc-4ccc-accc-cccccccccccc', 9),
  (gen_random_uuid(),'b0000003-0000-4000-a000-000000000003','cccc0001-cccc-4ccc-accc-cccccccccccc', 7),
  (gen_random_uuid(),'b0000004-0000-4000-a000-000000000004','cccc0001-cccc-4ccc-accc-cccccccccccc',12),
  (gen_random_uuid(),'b0000005-0000-4000-a000-000000000005','cccc0001-cccc-4ccc-accc-cccccccccccc',14),
  (gen_random_uuid(),'b0000006-0000-4000-a000-000000000006','cccc0001-cccc-4ccc-accc-cccccccccccc',16),
  (gen_random_uuid(),'b0000007-0000-4000-a000-000000000007','cccc0001-cccc-4ccc-accc-cccccccccccc', 7),
  (gen_random_uuid(),'b0000008-0000-4000-a000-000000000008','cccc0001-cccc-4ccc-accc-cccccccccccc',18),
  (gen_random_uuid(),'b0000009-0000-4000-a000-000000000009','cccc0001-cccc-4ccc-accc-cccccccccccc', 8),
  (gen_random_uuid(),'b000000a-0000-4000-a000-00000000000a','cccc0001-cccc-4ccc-accc-cccccccccccc',13),
  (gen_random_uuid(),'b000000b-0000-4000-a000-00000000000b','cccc0001-cccc-4ccc-accc-cccccccccccc',11),
  (gen_random_uuid(),'b000000c-0000-4000-a000-00000000000c','cccc0001-cccc-4ccc-accc-cccccccccccc',19),
  (gen_random_uuid(),'b000000d-0000-4000-a000-00000000000d','cccc0001-cccc-4ccc-accc-cccccccccccc',15),
  (gen_random_uuid(),'b000000e-0000-4000-a000-00000000000e','cccc0001-cccc-4ccc-accc-cccccccccccc',18),
  (gen_random_uuid(),'b000000f-0000-4000-a000-00000000000f','cccc0001-cccc-4ccc-accc-cccccccccccc',10),
  (gen_random_uuid(),'b0000010-0000-4000-a000-000000000010','cccc0001-cccc-4ccc-accc-cccccccccccc',22),
  -- Spyglass Hill (slope 143, rating 73.1)
  (gen_random_uuid(),'b0000001-0000-4000-a000-000000000001','cccc0002-cccc-4ccc-accc-cccccccccccd', 5),
  (gen_random_uuid(),'b0000002-0000-4000-a000-000000000002','cccc0002-cccc-4ccc-accc-cccccccccccd', 9),
  (gen_random_uuid(),'b0000003-0000-4000-a000-000000000003','cccc0002-cccc-4ccc-accc-cccccccccccd', 8),
  (gen_random_uuid(),'b0000004-0000-4000-a000-000000000004','cccc0002-cccc-4ccc-accc-cccccccccccd',12),
  (gen_random_uuid(),'b0000005-0000-4000-a000-000000000005','cccc0002-cccc-4ccc-accc-cccccccccccd',15),
  (gen_random_uuid(),'b0000006-0000-4000-a000-000000000006','cccc0002-cccc-4ccc-accc-cccccccccccd',16),
  (gen_random_uuid(),'b0000007-0000-4000-a000-000000000007','cccc0002-cccc-4ccc-accc-cccccccccccd', 7),
  (gen_random_uuid(),'b0000008-0000-4000-a000-000000000008','cccc0002-cccc-4ccc-accc-cccccccccccd',19),
  (gen_random_uuid(),'b0000009-0000-4000-a000-000000000009','cccc0002-cccc-4ccc-accc-cccccccccccd', 9),
  (gen_random_uuid(),'b000000a-0000-4000-a000-00000000000a','cccc0002-cccc-4ccc-accc-cccccccccccd',13),
  (gen_random_uuid(),'b000000b-0000-4000-a000-00000000000b','cccc0002-cccc-4ccc-accc-cccccccccccd',11),
  (gen_random_uuid(),'b000000c-0000-4000-a000-00000000000c','cccc0002-cccc-4ccc-accc-cccccccccccd',19),
  (gen_random_uuid(),'b000000d-0000-4000-a000-00000000000d','cccc0002-cccc-4ccc-accc-cccccccccccd',15),
  (gen_random_uuid(),'b000000e-0000-4000-a000-00000000000e','cccc0002-cccc-4ccc-accc-cccccccccccd',18),
  (gen_random_uuid(),'b000000f-0000-4000-a000-00000000000f','cccc0002-cccc-4ccc-accc-cccccccccccd',10),
  (gen_random_uuid(),'b0000010-0000-4000-a000-000000000010','cccc0002-cccc-4ccc-accc-cccccccccccd',22),
  -- Cypress Point (slope 141, rating 71.5)
  (gen_random_uuid(),'b0000001-0000-4000-a000-000000000001','cccc0003-cccc-4ccc-accc-ccccccccccce', 4),
  (gen_random_uuid(),'b0000002-0000-4000-a000-000000000002','cccc0003-cccc-4ccc-accc-ccccccccccce', 9),
  (gen_random_uuid(),'b0000003-0000-4000-a000-000000000003','cccc0003-cccc-4ccc-accc-ccccccccccce', 7),
  (gen_random_uuid(),'b0000004-0000-4000-a000-000000000004','cccc0003-cccc-4ccc-accc-ccccccccccce',11),
  (gen_random_uuid(),'b0000005-0000-4000-a000-000000000005','cccc0003-cccc-4ccc-accc-ccccccccccce',14),
  (gen_random_uuid(),'b0000006-0000-4000-a000-000000000006','cccc0003-cccc-4ccc-accc-ccccccccccce',15),
  (gen_random_uuid(),'b0000007-0000-4000-a000-000000000007','cccc0003-cccc-4ccc-accc-ccccccccccce', 6),
  (gen_random_uuid(),'b0000008-0000-4000-a000-000000000008','cccc0003-cccc-4ccc-accc-ccccccccccce',18),
  (gen_random_uuid(),'b0000009-0000-4000-a000-000000000009','cccc0003-cccc-4ccc-accc-ccccccccccce', 8),
  (gen_random_uuid(),'b000000a-0000-4000-a000-00000000000a','cccc0003-cccc-4ccc-accc-ccccccccccce',12),
  (gen_random_uuid(),'b000000b-0000-4000-a000-00000000000b','cccc0003-cccc-4ccc-accc-ccccccccccce',10),
  (gen_random_uuid(),'b000000c-0000-4000-a000-00000000000c','cccc0003-cccc-4ccc-accc-ccccccccccce',18),
  (gen_random_uuid(),'b000000d-0000-4000-a000-00000000000d','cccc0003-cccc-4ccc-accc-ccccccccccce',14),
  (gen_random_uuid(),'b000000e-0000-4000-a000-00000000000e','cccc0003-cccc-4ccc-accc-ccccccccccce',17),
  (gen_random_uuid(),'b000000f-0000-4000-a000-00000000000f','cccc0003-cccc-4ccc-accc-ccccccccccce', 9),
  (gen_random_uuid(),'b0000010-0000-4000-a000-000000000010','cccc0003-cccc-4ccc-accc-ccccccccccce',21),
  -- Poppy Hills (slope 135, rating 70.2)
  (gen_random_uuid(),'b0000001-0000-4000-a000-000000000001','cccc0004-cccc-4ccc-accc-cccccccccccf', 4),
  (gen_random_uuid(),'b0000002-0000-4000-a000-000000000002','cccc0004-cccc-4ccc-accc-cccccccccccf', 8),
  (gen_random_uuid(),'b0000003-0000-4000-a000-000000000003','cccc0004-cccc-4ccc-accc-cccccccccccf', 6),
  (gen_random_uuid(),'b0000004-0000-4000-a000-000000000004','cccc0004-cccc-4ccc-accc-cccccccccccf',10),
  (gen_random_uuid(),'b0000005-0000-4000-a000-000000000005','cccc0004-cccc-4ccc-accc-cccccccccccf',13),
  (gen_random_uuid(),'b0000006-0000-4000-a000-000000000006','cccc0004-cccc-4ccc-accc-cccccccccccf',14),
  (gen_random_uuid(),'b0000007-0000-4000-a000-000000000007','cccc0004-cccc-4ccc-accc-cccccccccccf', 6),
  (gen_random_uuid(),'b0000008-0000-4000-a000-000000000008','cccc0004-cccc-4ccc-accc-cccccccccccf',17),
  (gen_random_uuid(),'b0000009-0000-4000-a000-000000000009','cccc0004-cccc-4ccc-accc-cccccccccccf', 7),
  (gen_random_uuid(),'b000000a-0000-4000-a000-00000000000a','cccc0004-cccc-4ccc-accc-cccccccccccf',11),
  (gen_random_uuid(),'b000000b-0000-4000-a000-00000000000b','cccc0004-cccc-4ccc-accc-cccccccccccf',10),
  (gen_random_uuid(),'b000000c-0000-4000-a000-00000000000c','cccc0004-cccc-4ccc-accc-cccccccccccf',17),
  (gen_random_uuid(),'b000000d-0000-4000-a000-00000000000d','cccc0004-cccc-4ccc-accc-cccccccccccf',13),
  (gen_random_uuid(),'b000000e-0000-4000-a000-00000000000e','cccc0004-cccc-4ccc-accc-cccccccccccf',16),
  (gen_random_uuid(),'b000000f-0000-4000-a000-00000000000f','cccc0004-cccc-4ccc-accc-cccccccccccf', 8),
  (gen_random_uuid(),'b0000010-0000-4000-a000-000000000010','cccc0004-cccc-4ccc-accc-cccccccccccf',20)
ON CONFLICT (trip_player_id, course_id) DO NOTHING;

-- ============================================================================
-- 10. PLAYER ROUND TEES (16 x 4 = 64)
-- ============================================================================
DO $$
DECLARE
  v_tp uuid;
  v_course uuid;
  v_tps uuid[] := ARRAY[
    'b0000001-0000-4000-a000-000000000001','b0000002-0000-4000-a000-000000000002',
    'b0000003-0000-4000-a000-000000000003','b0000004-0000-4000-a000-000000000004',
    'b0000005-0000-4000-a000-000000000005','b0000006-0000-4000-a000-000000000006',
    'b0000007-0000-4000-a000-000000000007','b0000008-0000-4000-a000-000000000008',
    'b0000009-0000-4000-a000-000000000009','b000000a-0000-4000-a000-00000000000a',
    'b000000b-0000-4000-a000-00000000000b','b000000c-0000-4000-a000-00000000000c',
    'b000000d-0000-4000-a000-00000000000d','b000000e-0000-4000-a000-00000000000e',
    'b000000f-0000-4000-a000-00000000000f','b0000010-0000-4000-a000-000000000010'
  ]::uuid[];
  v_courses uuid[] := ARRAY[
    'cccc0001-cccc-4ccc-accc-cccccccccccc','cccc0002-cccc-4ccc-accc-cccccccccccd',
    'cccc0003-cccc-4ccc-accc-ccccccccccce','cccc0004-cccc-4ccc-accc-cccccccccccf'
  ]::uuid[];
  -- tee names: low handicappers play White, higher play Blue
  v_tees text[] := ARRAY['White','White','White','White','Blue','Blue','White','Blue',
                          'White','Blue','White','Blue','Blue','Blue','White','Blue'];
BEGIN
  FOR i IN 1..16 LOOP
    FOR j IN 1..4 LOOP
      INSERT INTO player_round_tees (id, trip_player_id, course_id, tee_name)
      VALUES (gen_random_uuid(), v_tps[i], v_courses[j], v_tees[i])
      ON CONFLICT (trip_player_id, course_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================================
-- 11. TEAMS (Nicklaus & Palmer)
-- ============================================================================
INSERT INTO teams (id, trip_id, name, color, abbreviation, captain_trip_player_id) VALUES
  ('d0001111-1111-4111-a111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   'Nicklaus', '', 'NIC', 'b0000001-0000-4000-a000-000000000001'),
  ('d0002222-2222-4222-a222-222222222222', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   'Palmer', '', 'PAL', 'b0000009-0000-4000-a000-000000000009')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. TEAM PLAYERS (8 + 8)
-- ============================================================================
INSERT INTO team_players (id, team_id, trip_player_id) VALUES
  -- Nicklaus: Andrew, Jake, Mike, Tom, Griffin, Danny, Chris, Ryan
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000001-0000-4000-a000-000000000001'),
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000002-0000-4000-a000-000000000002'),
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000003-0000-4000-a000-000000000003'),
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000004-0000-4000-a000-000000000004'),
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000005-0000-4000-a000-000000000005'),
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000006-0000-4000-a000-000000000006'),
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000007-0000-4000-a000-000000000007'),
  (gen_random_uuid(), 'd0001111-1111-4111-a111-111111111111', 'b0000008-0000-4000-a000-000000000008'),
  -- Palmer: Matt, Tyler, Zach, Logan, Derek, Sean, Kevin, Brett
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b0000009-0000-4000-a000-000000000009'),
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b000000a-0000-4000-a000-00000000000a'),
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b000000b-0000-4000-a000-00000000000b'),
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b000000c-0000-4000-a000-00000000000c'),
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b000000d-0000-4000-a000-00000000000d'),
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b000000e-0000-4000-a000-00000000000e'),
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b000000f-0000-4000-a000-00000000000f'),
  (gen_random_uuid(), 'd0002222-2222-4222-a222-222222222222', 'b0000010-0000-4000-a000-000000000010')
ON CONFLICT (team_id, trip_player_id) DO NOTHING;

-- ============================================================================
-- 13. TRIP COMPETITIONS + SESSIONS (4) + COMPETITION MATCHES (16)
-- ============================================================================
INSERT INTO trip_competitions (id, trip_id, name, format, team_a_id, team_b_id, win_points, tie_points, loss_points, status) VALUES
  ('f2000001-0000-4000-a000-000000000001', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   'Monterey Cup 2025', 'ryder_cup',
   'd0001111-1111-4111-a111-111111111111', 'd0002222-2222-4222-a222-222222222222',
   1.0, 0.5, 0.0, 'active')
ON CONFLICT (id) DO NOTHING;

-- Sessions (one per round)
INSERT INTO competition_sessions (id, competition_id, name, session_type, course_id, session_order, status) VALUES
  ('f3000001-0000-4000-a000-000000000001','f2000001-0000-4000-a000-000000000001','R1 — Pebble Beach','four_ball','cccc0001-cccc-4ccc-accc-cccccccccccc',1,'completed'),
  ('f3000002-0000-4000-a000-000000000002','f2000001-0000-4000-a000-000000000001','R2 — Spyglass Hill','four_ball','cccc0002-cccc-4ccc-accc-cccccccccccd',2,'completed'),
  ('f3000003-0000-4000-a000-000000000003','f2000001-0000-4000-a000-000000000001','R3 — Cypress Point','four_ball','cccc0003-cccc-4ccc-accc-ccccccccccce',3,'completed'),
  ('f3000004-0000-4000-a000-000000000004','f2000001-0000-4000-a000-000000000001','R4 — Poppy Hills','four_ball','cccc0004-cccc-4ccc-accc-cccccccccccf',4,'active')
ON CONFLICT (id) DO NOTHING;

-- Competition matches (16) — references trip_player IDs
-- Shorthand: b01=Andrew b02=Jake b03=Mike b04=Tom b05=Griffin b06=Danny b07=Chris b08=Ryan
--            b09=Matt b0a=Tyler b0b=Zach b0c=Logan b0d=Derek b0e=Sean b0f=Kevin b10=Brett
INSERT INTO competition_matches (id, session_id, team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2, result, winner, points_team_a, points_team_b, match_order, status) VALUES
  -- R1 Pebble
  ('f4000001-0000-4000-a000-000000000001','f3000001-0000-4000-a000-000000000001',
   'b0000001-0000-4000-a000-000000000001','b0000002-0000-4000-a000-000000000002',
   'b0000009-0000-4000-a000-000000000009','b000000a-0000-4000-a000-00000000000a',
   '3&2','team_a',1.0,0.0,1,'completed'),
  ('f4000002-0000-4000-a000-000000000002','f3000001-0000-4000-a000-000000000001',
   'b0000003-0000-4000-a000-000000000003','b0000004-0000-4000-a000-000000000004',
   'b000000b-0000-4000-a000-00000000000b','b000000c-0000-4000-a000-00000000000c',
   '1UP','team_b',0.0,1.0,2,'completed'),
  ('f4000003-0000-4000-a000-000000000003','f3000001-0000-4000-a000-000000000001',
   'b0000005-0000-4000-a000-000000000005','b0000006-0000-4000-a000-000000000006',
   'b000000d-0000-4000-a000-00000000000d','b000000e-0000-4000-a000-00000000000e',
   '2&1','team_a',1.0,0.0,3,'completed'),
  ('f4000004-0000-4000-a000-000000000004','f3000001-0000-4000-a000-000000000001',
   'b0000007-0000-4000-a000-000000000007','b0000008-0000-4000-a000-000000000008',
   'b000000f-0000-4000-a000-00000000000f','b0000010-0000-4000-a000-000000000010',
   'AS','tie',0.5,0.5,4,'completed'),
  -- R2 Spyglass
  ('f4000005-0000-4000-a000-000000000005','f3000002-0000-4000-a000-000000000002',
   'b0000001-0000-4000-a000-000000000001','b0000003-0000-4000-a000-000000000003',
   'b000000d-0000-4000-a000-00000000000d','b000000f-0000-4000-a000-00000000000f',
   '2UP','team_a',1.0,0.0,1,'completed'),
  ('f4000006-0000-4000-a000-000000000006','f3000002-0000-4000-a000-000000000002',
   'b0000002-0000-4000-a000-000000000002','b0000005-0000-4000-a000-000000000005',
   'b0000009-0000-4000-a000-000000000009','b000000b-0000-4000-a000-00000000000b',
   '4&3','team_b',0.0,1.0,2,'completed'),
  ('f4000007-0000-4000-a000-000000000007','f3000002-0000-4000-a000-000000000002',
   'b0000004-0000-4000-a000-000000000004','b0000007-0000-4000-a000-000000000007',
   'b000000a-0000-4000-a000-00000000000a','b000000e-0000-4000-a000-00000000000e',
   '1UP','team_a',1.0,0.0,3,'completed'),
  ('f4000008-0000-4000-a000-000000000008','f3000002-0000-4000-a000-000000000002',
   'b0000006-0000-4000-a000-000000000006','b0000008-0000-4000-a000-000000000008',
   'b000000c-0000-4000-a000-00000000000c','b0000010-0000-4000-a000-000000000010',
   '3&2','team_b',0.0,1.0,4,'completed'),
  -- R3 Cypress
  ('f4000009-0000-4000-a000-000000000009','f3000003-0000-4000-a000-000000000003',
   'b0000001-0000-4000-a000-000000000001','b0000005-0000-4000-a000-000000000005',
   'b0000009-0000-4000-a000-000000000009','b000000d-0000-4000-a000-00000000000d',
   '5&4','team_a',1.0,0.0,1,'completed'),
  ('f400000a-0000-4000-a000-00000000000a','f3000003-0000-4000-a000-000000000003',
   'b0000002-0000-4000-a000-000000000002','b0000006-0000-4000-a000-000000000006',
   'b000000a-0000-4000-a000-00000000000a','b000000e-0000-4000-a000-00000000000e',
   '2&1','team_b',0.0,1.0,2,'completed'),
  ('f400000b-0000-4000-a000-00000000000b','f3000003-0000-4000-a000-000000000003',
   'b0000003-0000-4000-a000-000000000003','b0000007-0000-4000-a000-000000000007',
   'b000000b-0000-4000-a000-00000000000b','b000000f-0000-4000-a000-00000000000f',
   '1UP','team_a',1.0,0.0,3,'completed'),
  ('f400000c-0000-4000-a000-00000000000c','f3000003-0000-4000-a000-000000000003',
   'b0000004-0000-4000-a000-000000000004','b0000008-0000-4000-a000-000000000008',
   'b000000c-0000-4000-a000-00000000000c','b0000010-0000-4000-a000-000000000010',
   'AS','tie',0.5,0.5,4,'completed'),
  -- R4 Poppy (in_progress)
  ('f400000d-0000-4000-a000-00000000000d','f3000004-0000-4000-a000-000000000004',
   'b0000001-0000-4000-a000-000000000001','b0000004-0000-4000-a000-000000000004',
   'b000000b-0000-4000-a000-00000000000b','b000000e-0000-4000-a000-00000000000e',
   NULL,NULL,0.0,0.0,1,'active'),
  ('f400000e-0000-4000-a000-00000000000e','f3000004-0000-4000-a000-000000000004',
   'b0000002-0000-4000-a000-000000000002','b0000007-0000-4000-a000-000000000007',
   'b0000009-0000-4000-a000-000000000009','b000000c-0000-4000-a000-00000000000c',
   NULL,NULL,0.0,0.0,2,'active'),
  ('f400000f-0000-4000-a000-00000000000f','f3000004-0000-4000-a000-000000000004',
   'b0000003-0000-4000-a000-000000000003','b0000008-0000-4000-a000-000000000008',
   'b000000d-0000-4000-a000-00000000000d','b0000010-0000-4000-a000-000000000010',
   NULL,NULL,0.0,0.0,3,'active'),
  ('f4000010-0000-4000-a000-000000000010','f3000004-0000-4000-a000-000000000004',
   'b0000005-0000-4000-a000-000000000005','b0000006-0000-4000-a000-000000000006',
   'b000000a-0000-4000-a000-00000000000a','b000000f-0000-4000-a000-00000000000f',
   NULL,NULL,0.0,0.0,4,'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 14. MATCHES (16: 12 completed, 4 in_progress)
-- ============================================================================
INSERT INTO matches (id, course_id, format, point_value, status, result, winner_side) VALUES
  -- R1 Pebble (completed)
  ('e0000001-0000-4000-a000-000000000001','cccc0001-cccc-4ccc-accc-cccccccccccc','2v2_best_ball',1.0,'completed','3&2','team_a'),
  ('e0000002-0000-4000-a000-000000000002','cccc0001-cccc-4ccc-accc-cccccccccccc','2v2_best_ball',1.0,'completed','1UP','team_b'),
  ('e0000003-0000-4000-a000-000000000003','cccc0001-cccc-4ccc-accc-cccccccccccc','2v2_best_ball',1.0,'completed','2&1','team_a'),
  ('e0000004-0000-4000-a000-000000000004','cccc0001-cccc-4ccc-accc-cccccccccccc','2v2_best_ball',1.0,'completed','AS','tie'),
  -- R2 Spyglass (completed)
  ('e0000005-0000-4000-a000-000000000005','cccc0002-cccc-4ccc-accc-cccccccccccd','2v2_best_ball',1.0,'completed','2UP','team_a'),
  ('e0000006-0000-4000-a000-000000000006','cccc0002-cccc-4ccc-accc-cccccccccccd','2v2_best_ball',1.0,'completed','4&3','team_b'),
  ('e0000007-0000-4000-a000-000000000007','cccc0002-cccc-4ccc-accc-cccccccccccd','2v2_best_ball',1.0,'completed','1UP','team_a'),
  ('e0000008-0000-4000-a000-000000000008','cccc0002-cccc-4ccc-accc-cccccccccccd','2v2_best_ball',1.0,'completed','3&2','team_b'),
  -- R3 Cypress (completed)
  ('e0000009-0000-4000-a000-000000000009','cccc0003-cccc-4ccc-accc-ccccccccccce','2v2_best_ball',1.0,'completed','5&4','team_a'),
  ('e000000a-0000-4000-a000-00000000000a','cccc0003-cccc-4ccc-accc-ccccccccccce','2v2_best_ball',1.0,'completed','2&1','team_b'),
  ('e000000b-0000-4000-a000-00000000000b','cccc0003-cccc-4ccc-accc-ccccccccccce','2v2_best_ball',1.0,'completed','1UP','team_a'),
  ('e000000c-0000-4000-a000-00000000000c','cccc0003-cccc-4ccc-accc-ccccccccccce','2v2_best_ball',1.0,'completed','AS','tie'),
  -- R4 Poppy (in_progress)
  ('e000000d-0000-4000-a000-00000000000d','cccc0004-cccc-4ccc-accc-cccccccccccf','2v2_best_ball',1.0,'in_progress',NULL,NULL),
  ('e000000e-0000-4000-a000-00000000000e','cccc0004-cccc-4ccc-accc-cccccccccccf','2v2_best_ball',1.0,'in_progress',NULL,NULL),
  ('e000000f-0000-4000-a000-00000000000f','cccc0004-cccc-4ccc-accc-cccccccccccf','2v2_best_ball',1.0,'in_progress',NULL,NULL),
  ('e0000010-0000-4000-a000-000000000010','cccc0004-cccc-4ccc-accc-cccccccccccf','2v2_best_ball',1.0,'in_progress',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 15. MATCH PLAYERS (4 per match = 64)
-- ============================================================================
INSERT INTO match_players (id, match_id, trip_player_id, side) VALUES
  -- m1: Andrew+Jake vs Matt+Tyler
  (gen_random_uuid(),'e0000001-0000-4000-a000-000000000001','b0000001-0000-4000-a000-000000000001','team_a'),
  (gen_random_uuid(),'e0000001-0000-4000-a000-000000000001','b0000002-0000-4000-a000-000000000002','team_a'),
  (gen_random_uuid(),'e0000001-0000-4000-a000-000000000001','b0000009-0000-4000-a000-000000000009','team_b'),
  (gen_random_uuid(),'e0000001-0000-4000-a000-000000000001','b000000a-0000-4000-a000-00000000000a','team_b'),
  -- m2: Mike+Tom vs Zach+Logan
  (gen_random_uuid(),'e0000002-0000-4000-a000-000000000002','b0000003-0000-4000-a000-000000000003','team_a'),
  (gen_random_uuid(),'e0000002-0000-4000-a000-000000000002','b0000004-0000-4000-a000-000000000004','team_a'),
  (gen_random_uuid(),'e0000002-0000-4000-a000-000000000002','b000000b-0000-4000-a000-00000000000b','team_b'),
  (gen_random_uuid(),'e0000002-0000-4000-a000-000000000002','b000000c-0000-4000-a000-00000000000c','team_b'),
  -- m3: Griffin+Danny vs Derek+Sean
  (gen_random_uuid(),'e0000003-0000-4000-a000-000000000003','b0000005-0000-4000-a000-000000000005','team_a'),
  (gen_random_uuid(),'e0000003-0000-4000-a000-000000000003','b0000006-0000-4000-a000-000000000006','team_a'),
  (gen_random_uuid(),'e0000003-0000-4000-a000-000000000003','b000000d-0000-4000-a000-00000000000d','team_b'),
  (gen_random_uuid(),'e0000003-0000-4000-a000-000000000003','b000000e-0000-4000-a000-00000000000e','team_b'),
  -- m4: Chris+Ryan vs Kevin+Brett
  (gen_random_uuid(),'e0000004-0000-4000-a000-000000000004','b0000007-0000-4000-a000-000000000007','team_a'),
  (gen_random_uuid(),'e0000004-0000-4000-a000-000000000004','b0000008-0000-4000-a000-000000000008','team_a'),
  (gen_random_uuid(),'e0000004-0000-4000-a000-000000000004','b000000f-0000-4000-a000-00000000000f','team_b'),
  (gen_random_uuid(),'e0000004-0000-4000-a000-000000000004','b0000010-0000-4000-a000-000000000010','team_b'),
  -- m5: Andrew+Mike vs Derek+Kevin
  (gen_random_uuid(),'e0000005-0000-4000-a000-000000000005','b0000001-0000-4000-a000-000000000001','team_a'),
  (gen_random_uuid(),'e0000005-0000-4000-a000-000000000005','b0000003-0000-4000-a000-000000000003','team_a'),
  (gen_random_uuid(),'e0000005-0000-4000-a000-000000000005','b000000d-0000-4000-a000-00000000000d','team_b'),
  (gen_random_uuid(),'e0000005-0000-4000-a000-000000000005','b000000f-0000-4000-a000-00000000000f','team_b'),
  -- m6: Jake+Griffin vs Matt+Zach
  (gen_random_uuid(),'e0000006-0000-4000-a000-000000000006','b0000002-0000-4000-a000-000000000002','team_a'),
  (gen_random_uuid(),'e0000006-0000-4000-a000-000000000006','b0000005-0000-4000-a000-000000000005','team_a'),
  (gen_random_uuid(),'e0000006-0000-4000-a000-000000000006','b0000009-0000-4000-a000-000000000009','team_b'),
  (gen_random_uuid(),'e0000006-0000-4000-a000-000000000006','b000000b-0000-4000-a000-00000000000b','team_b'),
  -- m7: Tom+Chris vs Tyler+Sean
  (gen_random_uuid(),'e0000007-0000-4000-a000-000000000007','b0000004-0000-4000-a000-000000000004','team_a'),
  (gen_random_uuid(),'e0000007-0000-4000-a000-000000000007','b0000007-0000-4000-a000-000000000007','team_a'),
  (gen_random_uuid(),'e0000007-0000-4000-a000-000000000007','b000000a-0000-4000-a000-00000000000a','team_b'),
  (gen_random_uuid(),'e0000007-0000-4000-a000-000000000007','b000000e-0000-4000-a000-00000000000e','team_b'),
  -- m8: Danny+Ryan vs Logan+Brett
  (gen_random_uuid(),'e0000008-0000-4000-a000-000000000008','b0000006-0000-4000-a000-000000000006','team_a'),
  (gen_random_uuid(),'e0000008-0000-4000-a000-000000000008','b0000008-0000-4000-a000-000000000008','team_a'),
  (gen_random_uuid(),'e0000008-0000-4000-a000-000000000008','b000000c-0000-4000-a000-00000000000c','team_b'),
  (gen_random_uuid(),'e0000008-0000-4000-a000-000000000008','b0000010-0000-4000-a000-000000000010','team_b'),
  -- m9: Andrew+Griffin vs Matt+Derek
  (gen_random_uuid(),'e0000009-0000-4000-a000-000000000009','b0000001-0000-4000-a000-000000000001','team_a'),
  (gen_random_uuid(),'e0000009-0000-4000-a000-000000000009','b0000005-0000-4000-a000-000000000005','team_a'),
  (gen_random_uuid(),'e0000009-0000-4000-a000-000000000009','b0000009-0000-4000-a000-000000000009','team_b'),
  (gen_random_uuid(),'e0000009-0000-4000-a000-000000000009','b000000d-0000-4000-a000-00000000000d','team_b'),
  -- m10: Jake+Danny vs Tyler+Sean
  (gen_random_uuid(),'e000000a-0000-4000-a000-00000000000a','b0000002-0000-4000-a000-000000000002','team_a'),
  (gen_random_uuid(),'e000000a-0000-4000-a000-00000000000a','b0000006-0000-4000-a000-000000000006','team_a'),
  (gen_random_uuid(),'e000000a-0000-4000-a000-00000000000a','b000000a-0000-4000-a000-00000000000a','team_b'),
  (gen_random_uuid(),'e000000a-0000-4000-a000-00000000000a','b000000e-0000-4000-a000-00000000000e','team_b'),
  -- m11: Mike+Chris vs Zach+Kevin
  (gen_random_uuid(),'e000000b-0000-4000-a000-00000000000b','b0000003-0000-4000-a000-000000000003','team_a'),
  (gen_random_uuid(),'e000000b-0000-4000-a000-00000000000b','b0000007-0000-4000-a000-000000000007','team_a'),
  (gen_random_uuid(),'e000000b-0000-4000-a000-00000000000b','b000000b-0000-4000-a000-00000000000b','team_b'),
  (gen_random_uuid(),'e000000b-0000-4000-a000-00000000000b','b000000f-0000-4000-a000-00000000000f','team_b'),
  -- m12: Tom+Ryan vs Logan+Brett
  (gen_random_uuid(),'e000000c-0000-4000-a000-00000000000c','b0000004-0000-4000-a000-000000000004','team_a'),
  (gen_random_uuid(),'e000000c-0000-4000-a000-00000000000c','b0000008-0000-4000-a000-000000000008','team_a'),
  (gen_random_uuid(),'e000000c-0000-4000-a000-00000000000c','b000000c-0000-4000-a000-00000000000c','team_b'),
  (gen_random_uuid(),'e000000c-0000-4000-a000-00000000000c','b0000010-0000-4000-a000-000000000010','team_b'),
  -- m13: Andrew+Tom vs Zach+Sean (in_progress)
  (gen_random_uuid(),'e000000d-0000-4000-a000-00000000000d','b0000001-0000-4000-a000-000000000001','team_a'),
  (gen_random_uuid(),'e000000d-0000-4000-a000-00000000000d','b0000004-0000-4000-a000-000000000004','team_a'),
  (gen_random_uuid(),'e000000d-0000-4000-a000-00000000000d','b000000b-0000-4000-a000-00000000000b','team_b'),
  (gen_random_uuid(),'e000000d-0000-4000-a000-00000000000d','b000000e-0000-4000-a000-00000000000e','team_b'),
  -- m14: Jake+Chris vs Matt+Logan (in_progress)
  (gen_random_uuid(),'e000000e-0000-4000-a000-00000000000e','b0000002-0000-4000-a000-000000000002','team_a'),
  (gen_random_uuid(),'e000000e-0000-4000-a000-00000000000e','b0000007-0000-4000-a000-000000000007','team_a'),
  (gen_random_uuid(),'e000000e-0000-4000-a000-00000000000e','b0000009-0000-4000-a000-000000000009','team_b'),
  (gen_random_uuid(),'e000000e-0000-4000-a000-00000000000e','b000000c-0000-4000-a000-00000000000c','team_b'),
  -- m15: Mike+Ryan vs Derek+Brett (in_progress)
  (gen_random_uuid(),'e000000f-0000-4000-a000-00000000000f','b0000003-0000-4000-a000-000000000003','team_a'),
  (gen_random_uuid(),'e000000f-0000-4000-a000-00000000000f','b0000008-0000-4000-a000-000000000008','team_a'),
  (gen_random_uuid(),'e000000f-0000-4000-a000-00000000000f','b000000d-0000-4000-a000-00000000000d','team_b'),
  (gen_random_uuid(),'e000000f-0000-4000-a000-00000000000f','b0000010-0000-4000-a000-000000000010','team_b'),
  -- m16: Griffin+Danny vs Tyler+Kevin (in_progress)
  (gen_random_uuid(),'e0000010-0000-4000-a000-000000000010','b0000005-0000-4000-a000-000000000005','team_a'),
  (gen_random_uuid(),'e0000010-0000-4000-a000-000000000010','b0000006-0000-4000-a000-000000000006','team_a'),
  (gen_random_uuid(),'e0000010-0000-4000-a000-000000000010','b000000a-0000-4000-a000-00000000000a','team_b'),
  (gen_random_uuid(),'e0000010-0000-4000-a000-000000000010','b000000f-0000-4000-a000-00000000000f','team_b')
ON CONFLICT (match_id, trip_player_id) DO NOTHING;

-- ============================================================================
-- 16. GAME FORMATS (idempotent — 16 standard formats)
-- ============================================================================
INSERT INTO game_formats (name, description, rules_summary, icon, scoring_type, scope, min_players, max_players, team_based, engine_key, default_config, tier) VALUES
  ('Skins',       'Win holes outright to claim skins. Ties carry over.', '', '💰', 'strokes', 'group', 2, 20, false, 'skins', '{"mode": "net", "carry_over": true}', 1),
  ('Nassau',      'Three bets in one: front 9, back 9, and overall 18.', '', '🏌️', 'match', 'foursome', 2, 4, false, 'nassau', '{"bet_amount": 5, "auto_press": true, "press_trigger": 2}', 1),
  ('Best Ball',   'Team game — lowest net score from each team counts.', '', '⭐', 'match', 'foursome', 4, 8, true, 'best_ball', '{"scoring": "match_play", "handicap_pct": 100}', 1),
  ('Match Play',  'Head-to-head, hole by hole. Win holes, not strokes.', '', '🤝', 'match', 'foursome', 2, 2, false, 'match_play', '{"handicap_pct": 100}', 1),
  ('Stroke Play', 'Lowest total score wins. Simple as it gets.', '', '📊', 'strokes', 'group', 2, 20, false, 'stroke_play', '{"mode": "net", "payout_structure": "top_3"}', 1),
  ('Scramble',    'Team picks the best shot each time.', '', '🏆', 'strokes', 'foursome', 4, 20, true, 'scramble', '{"handicap_formula": "25pct_combined"}', 1),
  ('Wolf',        'Rotating "Wolf" picks a partner or goes lone.', '', '🐺', 'points', 'foursome', 4, 5, false, 'wolf', '{"point_value": 1, "lone_wolf_multiplier": 2, "blind_wolf_multiplier": 3}', 2),
  ('Stableford',  'Points for scores relative to par.', '', '🎯', 'points', 'group', 2, 20, false, 'stableford', '{"modified": false}', 2),
  ('Vegas',       'Team scores combined as a two-digit number.', '', '🎰', 'points', 'foursome', 4, 4, true, 'vegas', '{"point_value": 0.25, "flip_on_birdie": true}', 2),
  ('Banker',      'One player "banks" each hole.', '', '🏦', 'points', 'foursome', 3, 6, false, 'banker', '{"base_value": 1, "double_on_worst": true}', 2),
  ('Hammer',      'Press game on steroids.', '', '🔨', 'match', 'foursome', 2, 4, false, 'hammer', '{"base_value": 1}', 2),
  ('Nine Point',  'Three players, 9 points per hole.', '', '9️⃣', 'points', 'foursome', 3, 3, false, 'nine_point', '{"point_split": [5, 3, 1], "value_per_point": 1}', 2),
  ('Dots / Trash','Earn points for greenies, sandies, barkies.', '', '🎯', 'dots', 'group', 2, 20, false, 'dots', '{"per_point_value": 1}', 2),
  ('20-Ball',     '2-player game: lock in exactly 20 net scores.', '', '🎱', 'strokes', 'foursome', 2, 2, false, 'twenty_ball', '{"min_holes_per_player":8,"max_holes_per_player":12,"total_locks":20}', 2)
ON CONFLICT (engine_key) DO NOTHING;

-- ============================================================================
-- 17. ROUND GAMES (skins per round) + PLAYERS + RESULTS
-- ============================================================================

-- Skins game per round
INSERT INTO round_games (id, course_id, trip_id, game_format_id, config, buy_in, status, created_by) VALUES
  ('f0000001-0000-4000-a000-000000000001',
   'cccc0001-cccc-4ccc-accc-cccccccccccc','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   (SELECT id FROM game_formats WHERE engine_key = 'skins'),
   '{"mode":"net","carry_over":true}', 20.00, 'finalized', '11111111-1111-1111-1111-111111111111'),
  ('f0000002-0000-4000-a000-000000000002',
   'cccc0002-cccc-4ccc-accc-cccccccccccd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   (SELECT id FROM game_formats WHERE engine_key = 'skins'),
   '{"mode":"net","carry_over":true}', 20.00, 'finalized', '11111111-1111-1111-1111-111111111111'),
  ('f0000003-0000-4000-a000-000000000003',
   'cccc0003-cccc-4ccc-accc-ccccccccccce','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   (SELECT id FROM game_formats WHERE engine_key = 'skins'),
   '{"mode":"net","carry_over":true}', 20.00, 'finalized', '11111111-1111-1111-1111-111111111111'),
  ('f0000004-0000-4000-a000-000000000004',
   'cccc0004-cccc-4ccc-accc-cccccccccccf','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
   (SELECT id FROM game_formats WHERE engine_key = 'skins'),
   '{"mode":"net","carry_over":true}', 20.00, 'active', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- All 16 players in each skins game
DO $$
DECLARE
  v_tps uuid[] := ARRAY[
    'b0000001-0000-4000-a000-000000000001','b0000002-0000-4000-a000-000000000002',
    'b0000003-0000-4000-a000-000000000003','b0000004-0000-4000-a000-000000000004',
    'b0000005-0000-4000-a000-000000000005','b0000006-0000-4000-a000-000000000006',
    'b0000007-0000-4000-a000-000000000007','b0000008-0000-4000-a000-000000000008',
    'b0000009-0000-4000-a000-000000000009','b000000a-0000-4000-a000-00000000000a',
    'b000000b-0000-4000-a000-00000000000b','b000000c-0000-4000-a000-00000000000c',
    'b000000d-0000-4000-a000-00000000000d','b000000e-0000-4000-a000-00000000000e',
    'b000000f-0000-4000-a000-00000000000f','b0000010-0000-4000-a000-000000000010'
  ]::uuid[];
  v_rgs uuid[] := ARRAY[
    'f0000001-0000-4000-a000-000000000001','f0000002-0000-4000-a000-000000000002',
    'f0000003-0000-4000-a000-000000000003','f0000004-0000-4000-a000-000000000004'
  ]::uuid[];
BEGIN
  FOR r IN 1..4 LOOP
    FOR p IN 1..16 LOOP
      INSERT INTO round_game_players (id, round_game_id, trip_player_id)
      VALUES (gen_random_uuid(), v_rgs[r], v_tps[p])
      ON CONFLICT (round_game_id, trip_player_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Game results for finalized rounds (R1-R3 skins winners)
INSERT INTO game_results (id, round_game_id, trip_player_id, position, points, money, details) VALUES
  -- R1 skins: Andrew won 4 skins, Chris won 3
  (gen_random_uuid(),'f0000001-0000-4000-a000-000000000001','b0000001-0000-4000-a000-000000000001',1,4,53.33,'{"skins_won":4}'),
  (gen_random_uuid(),'f0000001-0000-4000-a000-000000000001','b0000007-0000-4000-a000-000000000007',2,3,40.00,'{"skins_won":3}'),
  (gen_random_uuid(),'f0000001-0000-4000-a000-000000000001','b0000003-0000-4000-a000-000000000003',3,2,26.67,'{"skins_won":2}'),
  -- R2 skins: Matt won 3, Jake won 3
  (gen_random_uuid(),'f0000002-0000-4000-a000-000000000002','b0000009-0000-4000-a000-000000000009',1,3,40.00,'{"skins_won":3}'),
  (gen_random_uuid(),'f0000002-0000-4000-a000-000000000002','b0000002-0000-4000-a000-000000000002',2,3,40.00,'{"skins_won":3}'),
  (gen_random_uuid(),'f0000002-0000-4000-a000-000000000002','b000000f-0000-4000-a000-00000000000f',3,2,26.67,'{"skins_won":2}'),
  -- R3 skins: Andrew won 5, Griffin won 2
  (gen_random_uuid(),'f0000003-0000-4000-a000-000000000003','b0000001-0000-4000-a000-000000000001',1,5,66.67,'{"skins_won":5}'),
  (gen_random_uuid(),'f0000003-0000-4000-a000-000000000003','b0000005-0000-4000-a000-000000000005',2,2,26.67,'{"skins_won":2}'),
  (gen_random_uuid(),'f0000003-0000-4000-a000-000000000003','b0000009-0000-4000-a000-000000000009',3,2,26.67,'{"skins_won":2}')
ON CONFLICT (round_game_id, trip_player_id) DO NOTHING;

-- ============================================================================
-- 19. ROUND SCORES (PL/pgSQL: 16x54 completed + staggered R4 ≈ 1004)
-- ============================================================================
DO $$
DECLARE
  v_tps uuid[] := ARRAY[
    'b0000001-0000-4000-a000-000000000001','b0000002-0000-4000-a000-000000000002',
    'b0000003-0000-4000-a000-000000000003','b0000004-0000-4000-a000-000000000004',
    'b0000005-0000-4000-a000-000000000005','b0000006-0000-4000-a000-000000000006',
    'b0000007-0000-4000-a000-000000000007','b0000008-0000-4000-a000-000000000008',
    'b0000009-0000-4000-a000-000000000009','b000000a-0000-4000-a000-00000000000a',
    'b000000b-0000-4000-a000-00000000000b','b000000c-0000-4000-a000-00000000000c',
    'b000000d-0000-4000-a000-00000000000d','b000000e-0000-4000-a000-00000000000e',
    'b000000f-0000-4000-a000-00000000000f','b0000010-0000-4000-a000-000000000010'
  ]::uuid[];
  v_courses uuid[] := ARRAY[
    'cccc0001-cccc-4ccc-accc-cccccccccccc','cccc0002-cccc-4ccc-accc-cccccccccccd',
    'cccc0003-cccc-4ccc-accc-ccccccccccce','cccc0004-cccc-4ccc-accc-cccccccccccf'
  ]::uuid[];
  -- Handicap index per player (determines scoring tendency)
  v_hdcp numeric[] := ARRAY[4.2,8.1,6.5,10.3,12.8,14.2,5.9,16.5,7.4,11.6,9.8,17.1,13.5,15.8,8.7,19.4];
  -- R4 max holes per player: m13(thru12): p1,p4,p11,p14; m14(thru10): p2,p7,p9,p12; m15(thru8): p3,p8,p13,p16; m16(thru5): p5,p6,p10,p15
  v_r4_max int[] := ARRAY[12,10,8,12,5,5,10,8,10,5,12,10,8,12,5,8];
  v_hole record;
  v_score int;
  v_seed int;
  v_adj int;
  v_max_hole int;
  v_fwy boolean;
  v_gir_val boolean;
  v_putts_val int;
BEGIN
  FOR c IN 1..4 LOOP
    FOR p IN 1..16 LOOP
      -- Determine max hole for this player on this course
      IF c <= 3 THEN
        v_max_hole := 18;  -- completed rounds
      ELSE
        v_max_hole := v_r4_max[p];  -- staggered R4
      END IF;

      FOR v_hole IN
        SELECT id, hole_number, par FROM holes
        WHERE course_id = v_courses[c]
        ORDER BY hole_number
      LOOP
        -- Skip holes beyond what this player has completed
        IF v_hole.hole_number > v_max_hole THEN
          CONTINUE;
        END IF;

        -- Deterministic seed for variation
        v_seed := (p * 7 + v_hole.hole_number * 13 + c * 31) % 97;

        -- Base adjustment from handicap (strokes over par per hole)
        v_adj := CASE
          WHEN v_hdcp[p] < 6 THEN
            CASE WHEN v_seed % 6 = 0 THEN -1  -- birdie
                 WHEN v_seed % 6 < 3 THEN 0   -- par
                 WHEN v_seed % 6 < 5 THEN 1   -- bogey
                 ELSE 0 END
          WHEN v_hdcp[p] < 12 THEN
            CASE WHEN v_seed % 7 = 0 THEN -1  -- birdie
                 WHEN v_seed % 7 < 3 THEN 0   -- par
                 WHEN v_seed % 7 < 5 THEN 1   -- bogey
                 WHEN v_seed % 7 = 5 THEN 2   -- double
                 ELSE 0 END
          WHEN v_hdcp[p] < 16 THEN
            CASE WHEN v_seed % 8 = 0 THEN -1  -- birdie
                 WHEN v_seed % 8 < 3 THEN 0   -- par
                 WHEN v_seed % 8 < 6 THEN 1   -- bogey
                 WHEN v_seed % 8 = 6 THEN 2   -- double
                 ELSE 1 END
          ELSE  -- 16+
            CASE WHEN v_seed % 9 = 0 THEN -1  -- birdie (rare)
                 WHEN v_seed % 9 < 2 THEN 0   -- par
                 WHEN v_seed % 9 < 5 THEN 1   -- bogey
                 WHEN v_seed % 9 < 7 THEN 2   -- double
                 ELSE 3 END                    -- triple
        END;

        v_score := GREATEST(1, v_hole.par + v_adj);

        -- Fairway hit (par 4/5 only)
        v_fwy := CASE WHEN v_hole.par >= 4 THEN (v_seed % 3 <> 0) ELSE NULL END;
        -- GIR
        v_gir_val := (v_score - 2 <= v_hole.par);
        -- Putts
        v_putts_val := 1 + (v_seed % 3);
        IF v_putts_val > 4 THEN v_putts_val := 2; END IF;

        INSERT INTO round_scores (id, course_id, trip_player_id, hole_id, gross_score, fairway_hit, gir, putts)
        VALUES (gen_random_uuid(), v_courses[c], v_tps[p], v_hole.id, v_score, v_fwy, v_gir_val, v_putts_val)
        ON CONFLICT (course_id, trip_player_id, hole_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================================
-- 20. ROUND STATS (PL/pgSQL: aggregate from scores, R1-R3 only = 48)
-- ============================================================================
DO $$
DECLARE
  v_tps uuid[] := ARRAY[
    'b0000001-0000-4000-a000-000000000001','b0000002-0000-4000-a000-000000000002',
    'b0000003-0000-4000-a000-000000000003','b0000004-0000-4000-a000-000000000004',
    'b0000005-0000-4000-a000-000000000005','b0000006-0000-4000-a000-000000000006',
    'b0000007-0000-4000-a000-000000000007','b0000008-0000-4000-a000-000000000008',
    'b0000009-0000-4000-a000-000000000009','b000000a-0000-4000-a000-00000000000a',
    'b000000b-0000-4000-a000-00000000000b','b000000c-0000-4000-a000-00000000000c',
    'b000000d-0000-4000-a000-00000000000d','b000000e-0000-4000-a000-00000000000e',
    'b000000f-0000-4000-a000-00000000000f','b0000010-0000-4000-a000-000000000010'
  ]::uuid[];
  v_courses uuid[] := ARRAY[
    'cccc0001-cccc-4ccc-accc-cccccccccccc','cccc0002-cccc-4ccc-accc-cccccccccccd',
    'cccc0003-cccc-4ccc-accc-ccccccccccce'
  ]::uuid[];  -- R1-R3 only (completed)
  v_tp uuid;
  v_crs uuid;
  v_stats record;
  v_hdcp_strokes int;
BEGIN
  FOREACH v_crs IN ARRAY v_courses LOOP
    FOREACH v_tp IN ARRAY v_tps LOOP
      SELECT INTO v_stats
        COUNT(*)::int                                                    AS holes_played,
        SUM(rs.gross_score)::int                                         AS gross_total,
        SUM(h.par)::int                                                  AS par_total,
        COUNT(*) FILTER (WHERE rs.gross_score - h.par <= -2)::int        AS eagles,
        COUNT(*) FILTER (WHERE rs.gross_score - h.par = -1)::int         AS birdies,
        COUNT(*) FILTER (WHERE rs.gross_score = h.par)::int              AS pars,
        COUNT(*) FILTER (WHERE rs.gross_score - h.par = 1)::int          AS bogeys,
        COUNT(*) FILTER (WHERE rs.gross_score - h.par = 2)::int          AS double_bogeys,
        COUNT(*) FILTER (WHERE rs.gross_score - h.par >= 3)::int         AS others,
        MIN(rs.gross_score)::int                                         AS best_hole_score,
        MAX(rs.gross_score)::int                                         AS worst_hole_score,
        MIN(rs.gross_score - h.par)::int                                 AS best_hole_vs_par,
        MAX(rs.gross_score - h.par)::int                                 AS worst_hole_vs_par,
        SUM(rs.gross_score) FILTER (WHERE h.par = 3)::int               AS par3_total,
        COUNT(*) FILTER (WHERE h.par = 3)::int                           AS par3_count,
        SUM(rs.gross_score) FILTER (WHERE h.par = 4)::int               AS par4_total,
        COUNT(*) FILTER (WHERE h.par = 4)::int                           AS par4_count,
        SUM(rs.gross_score) FILTER (WHERE h.par = 5)::int               AS par5_total,
        COUNT(*) FILTER (WHERE h.par = 5)::int                           AS par5_count,
        SUM(rs.gross_score) FILTER (WHERE h.hole_number <= 9)::int       AS front_nine_gross,
        SUM(rs.gross_score) FILTER (WHERE h.hole_number > 9)::int        AS back_nine_gross,
        COUNT(*) FILTER (WHERE rs.gir = true)::int                       AS greens_in_regulation,
        COUNT(*) FILTER (WHERE rs.fairway_hit = true)::int               AS fairways_hit,
        COUNT(*) FILTER (WHERE h.par >= 4)::int                          AS fairways_total,
        COALESCE(SUM(rs.putts), 0)::int                                  AS total_putts,
        ROUND(AVG(rs.gross_score)::numeric, 2)                           AS scoring_average,
        ROUND(AVG(rs.putts)::numeric, 2)                                 AS putts_per_hole
      FROM round_scores rs
      JOIN holes h ON h.id = rs.hole_id
      WHERE rs.course_id = v_crs AND rs.trip_player_id = v_tp;

      -- Get handicap strokes for net calculation
      SELECT handicap_strokes INTO v_hdcp_strokes
      FROM player_course_handicaps
      WHERE trip_player_id = v_tp AND course_id = v_crs;

      INSERT INTO round_stats (
        id, course_id, trip_player_id,
        gross_total, net_total, par_total, holes_played,
        eagles, birdies, pars, bogeys, double_bogeys, others,
        best_hole_score, worst_hole_score, best_hole_vs_par, worst_hole_vs_par,
        par3_total, par3_count, par4_total, par4_count, par5_total, par5_count,
        front_nine_gross, back_nine_gross,
        greens_in_regulation, fairways_hit, fairways_total,
        total_putts, scoring_average, putts_per_hole
      ) VALUES (
        gen_random_uuid(), v_crs, v_tp,
        v_stats.gross_total,
        v_stats.gross_total - COALESCE(v_hdcp_strokes, 0),
        v_stats.par_total,
        v_stats.holes_played,
        v_stats.eagles, v_stats.birdies, v_stats.pars,
        v_stats.bogeys, v_stats.double_bogeys, v_stats.others,
        v_stats.best_hole_score, v_stats.worst_hole_score,
        v_stats.best_hole_vs_par, v_stats.worst_hole_vs_par,
        v_stats.par3_total, v_stats.par3_count,
        v_stats.par4_total, v_stats.par4_count,
        v_stats.par5_total, v_stats.par5_count,
        v_stats.front_nine_gross, v_stats.back_nine_gross,
        v_stats.greens_in_regulation, v_stats.fairways_hit, v_stats.fairways_total,
        v_stats.total_putts, v_stats.scoring_average, v_stats.putts_per_hole
      )
      ON CONFLICT (course_id, trip_player_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================================
-- 21. SETTLEMENT LEDGER
-- ============================================================================
INSERT INTO settlement_ledger (id, trip_id, trip_player_id, source_type, amount, description) VALUES
  -- Match results (R1-R3 completed matches, $100 buy-in)
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000001-0000-4000-a000-000000000001','game_result', 100.00,'R1 Match win (3&2) vs Matt+Tyler'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000002-0000-4000-a000-000000000002','game_result', 100.00,'R1 Match win (3&2) vs Matt+Tyler'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000009-0000-4000-a000-000000000009','game_result',-100.00,'R1 Match loss to Andrew+Jake'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b000000a-0000-4000-a000-00000000000a','game_result',-100.00,'R1 Match loss to Andrew+Jake'),
  -- Skins payouts
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000001-0000-4000-a000-000000000001','game_result', 53.33,'R1 Skins: 4 skins won'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000007-0000-4000-a000-000000000007','game_result', 40.00,'R1 Skins: 3 skins won'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000003-0000-4000-a000-000000000003','game_result', 26.67,'R1 Skins: 2 skins won'),
  -- R2 match win
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000001-0000-4000-a000-000000000001','game_result', 100.00,'R2 Match win (2UP) vs Derek+Kevin'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000003-0000-4000-a000-000000000003','game_result', 100.00,'R2 Match win (2UP) vs Derek+Kevin'),
  -- R3 match win
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000001-0000-4000-a000-000000000001','game_result', 100.00,'R3 Match win (5&4) vs Matt+Derek'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','b0000005-0000-4000-a000-000000000005','game_result', 100.00,'R3 Match win (5&4) vs Matt+Derek')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 22. ACTIVITY FEED (12 entries)
-- ============================================================================
INSERT INTO activity_feed (id, trip_id, event_type, trip_player_id, course_id, title, detail, icon, created_at) VALUES
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','round_started',NULL,'cccc0001-cccc-4ccc-accc-cccccccccccc',
   'Round 1 at Pebble Beach has started','All 16 players teeing off','⛳','2025-06-12 07:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','birdie','b0000001-0000-4000-a000-000000000001','cccc0001-cccc-4ccc-accc-cccccccccccc',
   'Andrew birdies #2 at Pebble','Net eagle with handicap strokes','🐦','2025-06-12 08:15:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','round_finalized',NULL,'cccc0001-cccc-4ccc-accc-cccccccccccc',
   'Round 1 complete — Nicklaus 2.5, Palmer 1.5','Nicklaus takes early lead','🏁','2025-06-12 14:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','round_started',NULL,'cccc0002-cccc-4ccc-accc-cccccccccccd',
   'Round 2 at Spyglass Hill has started','New pairings for round 2','⛳','2025-06-13 07:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','skin_won','b0000009-0000-4000-a000-000000000009','cccc0002-cccc-4ccc-accc-cccccccccccd',
   'Matt wins a 3-hole carryover skin','Worth $40 — huge pot on Spyglass #10','💰','2025-06-13 11:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','round_finalized',NULL,'cccc0002-cccc-4ccc-accc-cccccccccccd',
   'Round 2 complete — Nicklaus 4.5, Palmer 3.5','Nicklaus extends lead','🏁','2025-06-13 14:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','round_started',NULL,'cccc0003-cccc-4ccc-accc-ccccccccccce',
   'Round 3 at Cypress Point has started','Crunch time for Team Palmer','⛳','2025-06-14 07:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','birdie','b0000001-0000-4000-a000-000000000001','cccc0003-cccc-4ccc-accc-ccccccccccce',
   'Andrew birdies #13 at Cypress','Back-to-back birdies for the captain','🐦','2025-06-14 12:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','lead_change',NULL,'cccc0003-cccc-4ccc-accc-ccccccccccce',
   'Nicklaus pulls ahead 7-5 after R3','Palmer needs a big R4 to come back','📊','2025-06-14 14:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','round_finalized',NULL,'cccc0003-cccc-4ccc-accc-ccccccccccce',
   'Round 3 complete — Nicklaus 7, Palmer 5','Heading into the final round','🏁','2025-06-14 15:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','round_started',NULL,'cccc0004-cccc-4ccc-accc-cccccccccccf',
   'Final round at Poppy Hills underway','Can Palmer mount a comeback?','⛳','2025-06-15 07:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','birdie','b0000005-0000-4000-a000-000000000005','cccc0004-cccc-4ccc-accc-cccccccccccf',
   'Griffin birdies #3 at Poppy','Team Nicklaus rolling early in R4','🐦','2025-06-15 08:30:00-07')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 23. TRIP MESSAGES (golf banter — 12 messages)
-- ============================================================================
INSERT INTO trip_messages (id, trip_id, user_id, content, is_system, created_at) VALUES
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',
   'Welcome to the Monterey Cup 2025! Teams are set. Let''s go Nicklaus!', false, '2025-06-11 20:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','99999999-9999-9999-9999-999999999999',
   'Palmer squad is ready. You guys are going down.', false, '2025-06-11 20:05:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222',
   'Pebble Beach tomorrow. Tee time is 7:30 AM sharp — don''t be late.', false, '2025-06-11 21:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',NULL,
   'Round 1 at Pebble Beach Golf Links has begun.', true, '2025-06-12 07:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','aaaa1111-1111-4111-a111-111111111111',
   'Andrew is putting on a clinic out here. Someone stop this man.', false, '2025-06-12 12:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','77777777-7777-7777-7777-777777777777',
   'Spyglass was brutal. Those back 9 pins were tucked.', false, '2025-06-13 15:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','aaaa2222-2222-4222-a222-222222222222',
   'How is Nicklaus up 7-5? We need to rally in R4 boys.', false, '2025-06-14 16:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','55555555-5555-5555-5555-555555555555',
   'Cypress Point is the most beautiful course I''ve ever played.', false, '2025-06-14 16:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','aaaa7777-7777-4777-a777-777777777777',
   'Someone check on Logan. He lost 4 balls on the back nine at Cypress.', false, '2025-06-14 17:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',NULL,
   'Final round at Poppy Hills Golf Course has begun.', true, '2025-06-15 07:30:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333',
   'Poppy Hills is playing soft today. Birdie fest incoming.', false, '2025-06-15 08:00:00-07'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',
   'Two more points and we close it out. Stay focused team!', false, '2025-06-15 10:00:00-07')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 24. FRIENDSHIPS (Andrew ↔ all 15)
-- ============================================================================
INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at) VALUES
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','66666666-6666-6666-6666-666666666666','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','77777777-7777-7777-7777-777777777777','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','88888888-8888-8888-8888-888888888888','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','aaaa1111-1111-4111-a111-111111111111','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','aaaa2222-2222-4222-a222-222222222222','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','aaaa3333-3333-4333-a333-333333333333','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','aaaa4444-4444-4444-a444-444444444444','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','aaaa5555-5555-4555-a555-555555555555','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','aaaa6666-6666-4666-a666-666666666666','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','aaaa7777-7777-4777-a777-777777777777','accepted',now(),now())
ON CONFLICT (requester_id, addressee_id) DO NOTHING;

-- ============================================================================
-- 25b. WALLETS (Andrew ↔ a few players)
-- ============================================================================
INSERT INTO player_wallets (id, player_a_id, player_b_id, balance, last_trip_id) VALUES
  ('f9000001-0000-4000-a000-000000000001',
   'a1000001-0000-4000-a000-000000000001','a1000002-0000-4000-a000-000000000002',
   25.00, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
  ('f9000002-0000-4000-a000-000000000002',
   'a1000001-0000-4000-a000-000000000001','a1000003-0000-4000-a000-000000000003',
   -15.00, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
  ('f9000003-0000-4000-a000-000000000003',
   'a1000001-0000-4000-a000-000000000001','a1000009-0000-4000-a000-000000000009',
   100.00, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
  ('f9000004-0000-4000-a000-000000000004',
   'a1000002-0000-4000-a000-000000000002','a1000009-0000-4000-a000-000000000009',
   50.00, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
  ('f9000005-0000-4000-a000-000000000005',
   'a1000003-0000-4000-a000-000000000003','a100000d-0000-4000-a000-00000000000d',
   75.00, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
  ('f9000006-0000-4000-a000-000000000006',
   'a1000005-0000-4000-a000-000000000005','a100000a-0000-4000-a000-00000000000a',
   -30.00, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (player_a_id, player_b_id) DO NOTHING;

-- ============================================================================
-- 25c. SCORECARD PREFERENCES (Andrew only)
-- ============================================================================
INSERT INTO scorecard_preferences (id, user_id, visible_columns, view_mode) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
   '["gross","net","vs_par","putts"]'::jsonb, 'expanded')
ON CONFLICT (user_id) DO UPDATE SET visible_columns = EXCLUDED.visible_columns, view_mode = EXCLUDED.view_mode;

-- ============================================================================
-- 25d. AWARDS (trip awards for R1-R3)
-- ============================================================================
INSERT INTO trip_awards (id, trip_id, award_key, award_name, award_description, award_icon, trip_player_id, value) VALUES
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','low_gross','Low Gross','Lowest gross score across all rounds','🏆',
   'b0000001-0000-4000-a000-000000000001', NULL),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','low_net','Low Net','Lowest net score across all rounds','🥇',
   'b0000007-0000-4000-a000-000000000007', NULL),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','most_birdies','Most Birdies','Most birdies across all rounds','🐦',
   'b0000001-0000-4000-a000-000000000001', NULL),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','most_skins','Most Skins Won','Most skins won across all rounds','💰',
   'b0000001-0000-4000-a000-000000000001', NULL),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','longest_drive','Longest Drive','Longest measured drive of the trip','💪',
   'b0000008-0000-4000-a000-000000000008', '312 yards'),
  (gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','worst_hole','Worst Single Hole','Highest score on a single hole','💀',
   'b0000010-0000-4000-a000-000000000010', NULL)
ON CONFLICT (trip_id, award_key) DO NOTHING;

-- ============================================================================
-- 30. FRIENDS PLAYING NOW — separate trip seed data
--     5 new friends of Andrew + 3 non-friends, in a separate active trip
--     Match 1: 4 friends (2v2) thru 12 holes
--     Match 2: 5th friend + 3 non-friends (2v2) thru 9 holes
--
--   Auth users:    bb001111-...-111111111111  thru  bb008888-...-888888888888
--   Players:       a2000001-...-000000000001  thru  ...000000000008
--   Trip:          bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb
--   Course:        cccc0005-cccc-4ccc-accc-cccccccccccc
--   Holes:         c0050001-...-000000000001  thru  ...000000000012 (hex)
--   Trip players:  b2000001-...-000000000001  thru  ...000000000008
--   Matches:       e2000001-...-000000000001  and   e2000002-...-000000000002
-- ============================================================================

-- 30a. Auth users (8)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, aud, role
) VALUES
  ('bb001111-1111-4111-a111-111111111111', 'nate@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Nate Harper"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('bb002222-2222-4222-a222-222222222222', 'austin@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Austin Reed"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('bb003333-3333-4333-a333-333333333333', 'miles@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Miles Carter"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('bb004444-4444-4444-a444-444444444444', 'cole@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Cole Jennings"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('bb005555-5555-4555-a555-555555555555', 'drew@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Drew Palmer"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  -- Non-friends (not friended with Andrew)
  ('bb006666-6666-4666-a666-666666666666', 'marcus@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Marcus Bell"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('bb007777-7777-4777-a777-777777777777', 'travis@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Travis Long"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('bb008888-8888-4888-a888-888888888888', 'jordan@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Jordan West"}'::jsonb, now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 30b. Player profiles update
UPDATE player_profiles SET handicap_index=7.3,  home_club='Torrey Pines GC',   preferred_tee='White', location='San Diego, California'     WHERE user_id='bb001111-1111-4111-a111-111111111111';
UPDATE player_profiles SET handicap_index=11.2, home_club='Riviera CC',         preferred_tee='Blue',  location='Los Angeles, California'   WHERE user_id='bb002222-2222-4222-a222-222222222222';
UPDATE player_profiles SET handicap_index=9.5,  home_club='Bel-Air CC',         preferred_tee='White', location='Los Angeles, California'   WHERE user_id='bb003333-3333-4333-a333-333333333333';
UPDATE player_profiles SET handicap_index=14.0, home_club='Wilshire CC',        preferred_tee='Blue',  location='Los Angeles, California'   WHERE user_id='bb004444-4444-4444-a444-444444444444';
UPDATE player_profiles SET handicap_index=6.8,  home_club='Los Angeles CC',     preferred_tee='White', location='Los Angeles, California'   WHERE user_id='bb005555-5555-4555-a555-555555555555';
UPDATE player_profiles SET handicap_index=12.4, home_club='Lakeside GC',        preferred_tee='Blue',  location='Los Angeles, California'   WHERE user_id='bb006666-6666-4666-a666-666666666666';
UPDATE player_profiles SET handicap_index=15.9, home_club='Griffith Park GC',   preferred_tee='Blue',  location='Los Angeles, California'   WHERE user_id='bb007777-7777-4777-a777-777777777777';
UPDATE player_profiles SET handicap_index=10.1, home_club='Rancho Park GC',     preferred_tee='White', location='Los Angeles, California'   WHERE user_id='bb008888-8888-4888-a888-888888888888';

-- 30c. Players (8)
INSERT INTO players (id, name, email, handicap_index, user_id) VALUES
  ('a2000001-0000-4000-a000-000000000001', 'Nate Harper',    'nate@forelive.test',    7.3,  'bb001111-1111-4111-a111-111111111111'),
  ('a2000002-0000-4000-a000-000000000002', 'Austin Reed',    'austin@forelive.test',  11.2, 'bb002222-2222-4222-a222-222222222222'),
  ('a2000003-0000-4000-a000-000000000003', 'Miles Carter',   'miles@forelive.test',   9.5,  'bb003333-3333-4333-a333-333333333333'),
  ('a2000004-0000-4000-a000-000000000004', 'Cole Jennings',  'cole@forelive.test',    14.0, 'bb004444-4444-4444-a444-444444444444'),
  ('a2000005-0000-4000-a000-000000000005', 'Drew Palmer',    'drew@forelive.test',    6.8,  'bb005555-5555-4555-a555-555555555555'),
  ('a2000006-0000-4000-a000-000000000006', 'Marcus Bell',    'marcus@forelive.test',  12.4, 'bb006666-6666-4666-a666-666666666666'),
  ('a2000007-0000-4000-a000-000000000007', 'Travis Long',    'travis@forelive.test',  15.9, 'bb007777-7777-4777-a777-777777777777'),
  ('a2000008-0000-4000-a000-000000000008', 'Jordan West',    'jordan@forelive.test',  10.1, 'bb008888-8888-4888-a888-888888888888')
ON CONFLICT (id) DO NOTHING;

-- 30d. Quick round (not a full trip — Andrew is NOT a member)
INSERT INTO trips (id, name, year, location, status, match_buy_in, skins_buy_in, skins_mode, handicap_mode, is_quick_round, created_by) VALUES
  ('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'Quick Round — Riviera CC', 2025, 'Los Angeles, CA',
   'active', 50.00, 5.00, 'net', 'static', true,
   'bb001111-1111-4111-a111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- 30e. Trip members (8 — no Andrew)
INSERT INTO trip_members (id, trip_id, user_id, role) VALUES
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb001111-1111-4111-a111-111111111111', 'owner'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb002222-2222-4222-a222-222222222222', 'player'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb003333-3333-4333-a333-333333333333', 'player'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb004444-4444-4444-a444-444444444444', 'player'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb005555-5555-4555-a555-555555555555', 'player'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb006666-6666-4666-a666-666666666666', 'player'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb007777-7777-4777-a777-777777777777', 'player'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'bb008888-8888-4888-a888-888888888888', 'player')
ON CONFLICT DO NOTHING;

-- 30f. Trip players (8)
INSERT INTO trip_players (id, trip_id, player_id, paid) VALUES
  ('b2000001-0000-4000-a000-000000000001','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000001-0000-4000-a000-000000000001', true),
  ('b2000002-0000-4000-a000-000000000002','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000002-0000-4000-a000-000000000002', true),
  ('b2000003-0000-4000-a000-000000000003','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000003-0000-4000-a000-000000000003', true),
  ('b2000004-0000-4000-a000-000000000004','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000004-0000-4000-a000-000000000004', true),
  ('b2000005-0000-4000-a000-000000000005','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000005-0000-4000-a000-000000000005', true),
  ('b2000006-0000-4000-a000-000000000006','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000006-0000-4000-a000-000000000006', true),
  ('b2000007-0000-4000-a000-000000000007','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000007-0000-4000-a000-000000000007', true),
  ('b2000008-0000-4000-a000-000000000008','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','a2000008-0000-4000-a000-000000000008', true)
ON CONFLICT (id) DO NOTHING;

-- 30g. Course (1 course, 18 holes — Riviera CC)
INSERT INTO courses (id, trip_id, name, slope, rating, par, round_number, round_date, latitude, longitude) VALUES
  ('cccc0005-cccc-4ccc-accc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
   'Riviera Country Club', 142, 71.6, 72, 1, '2025-07-10', 34.0500, -118.4850)
ON CONFLICT (id) DO NOTHING;

-- 30h. Holes (18 for Riviera)
INSERT INTO holes (id, course_id, hole_number, par, handicap_index, yardage) VALUES
  ('c0050001-0000-4000-a000-000000000001','cccc0005-cccc-4ccc-accc-cccccccccccc', 1, 4, 11, '{"Blue":503,"White":475,"Gold":445}'),
  ('c0050002-0000-4000-a000-000000000002','cccc0005-cccc-4ccc-accc-cccccccccccc', 2, 4,  3, '{"Blue":461,"White":435,"Gold":407}'),
  ('c0050003-0000-4000-a000-000000000003','cccc0005-cccc-4ccc-accc-cccccccccccc', 3, 5,  7, '{"Blue":564,"White":535,"Gold":505}'),
  ('c0050004-0000-4000-a000-000000000004','cccc0005-cccc-4ccc-accc-cccccccccccc', 4, 3, 15, '{"Blue":236,"White":218,"Gold":198}'),
  ('c0050005-0000-4000-a000-000000000005','cccc0005-cccc-4ccc-accc-cccccccccccc', 5, 4,  1, '{"Blue":434,"White":413,"Gold":390}'),
  ('c0050006-0000-4000-a000-000000000006','cccc0005-cccc-4ccc-accc-cccccccccccc', 6, 3, 17, '{"Blue":176,"White":159,"Gold":140}'),
  ('c0050007-0000-4000-a000-000000000007','cccc0005-cccc-4ccc-accc-cccccccccccc', 7, 4,  5, '{"Blue":408,"White":385,"Gold":360}'),
  ('c0050008-0000-4000-a000-000000000008','cccc0005-cccc-4ccc-accc-cccccccccccc', 8, 4,  9, '{"Blue":433,"White":410,"Gold":385}'),
  ('c0050009-0000-4000-a000-000000000009','cccc0005-cccc-4ccc-accc-cccccccccccc', 9, 4, 13, '{"Blue":460,"White":438,"Gold":412}'),
  ('c005000a-0000-4000-a000-00000000000a','cccc0005-cccc-4ccc-accc-cccccccccccc',10, 4,  2, '{"Blue":315,"White":296,"Gold":275}'),
  ('c005000b-0000-4000-a000-00000000000b','cccc0005-cccc-4ccc-accc-cccccccccccc',11, 5,  6, '{"Blue":564,"White":537,"Gold":510}'),
  ('c005000c-0000-4000-a000-00000000000c','cccc0005-cccc-4ccc-accc-cccccccccccc',12, 4, 10, '{"Blue":479,"White":455,"Gold":430}'),
  ('c005000d-0000-4000-a000-00000000000d','cccc0005-cccc-4ccc-accc-cccccccccccc',13, 4, 14, '{"Blue":459,"White":435,"Gold":408}'),
  ('c005000e-0000-4000-a000-00000000000e','cccc0005-cccc-4ccc-accc-cccccccccccc',14, 3, 18, '{"Blue":177,"White":162,"Gold":143}'),
  ('c005000f-0000-4000-a000-00000000000f','cccc0005-cccc-4ccc-accc-cccccccccccc',15, 4,  4, '{"Blue":487,"White":462,"Gold":435}'),
  ('c0050010-0000-4000-a000-000000000010','cccc0005-cccc-4ccc-accc-cccccccccccc',16, 3, 16, '{"Blue":166,"White":150,"Gold":132}'),
  ('c0050011-0000-4000-a000-000000000011','cccc0005-cccc-4ccc-accc-cccccccccccc',17, 5,  8, '{"Blue":590,"White":558,"Gold":525}'),
  ('c0050012-0000-4000-a000-000000000012','cccc0005-cccc-4ccc-accc-cccccccccccc',18, 4, 12, '{"Blue":454,"White":430,"Gold":405}');

-- 30i. Player course handicaps
INSERT INTO player_course_handicaps (trip_player_id, course_id, handicap_strokes) VALUES
  ('b2000001-0000-4000-a000-000000000001','cccc0005-cccc-4ccc-accc-cccccccccccc', 7),
  ('b2000002-0000-4000-a000-000000000002','cccc0005-cccc-4ccc-accc-cccccccccccc', 11),
  ('b2000003-0000-4000-a000-000000000003','cccc0005-cccc-4ccc-accc-cccccccccccc', 10),
  ('b2000004-0000-4000-a000-000000000004','cccc0005-cccc-4ccc-accc-cccccccccccc', 14),
  ('b2000005-0000-4000-a000-000000000005','cccc0005-cccc-4ccc-accc-cccccccccccc', 7),
  ('b2000006-0000-4000-a000-000000000006','cccc0005-cccc-4ccc-accc-cccccccccccc', 12),
  ('b2000007-0000-4000-a000-000000000007','cccc0005-cccc-4ccc-accc-cccccccccccc', 16),
  ('b2000008-0000-4000-a000-000000000008','cccc0005-cccc-4ccc-accc-cccccccccccc', 10)
ON CONFLICT (trip_player_id, course_id) DO NOTHING;

-- 30j. Matches (2 in-progress)
--   Match 1: Nate+Austin vs Miles+Cole (4 friends, 2v2 best ball, thru 12)
--   Match 2: Drew+Marcus vs Travis+Jordan (5th friend + 3 non-friends, 2v2 best ball, thru 10)
INSERT INTO matches (id, course_id, format, point_value, status) VALUES
  ('e2000001-0000-4000-a000-000000000001', 'cccc0005-cccc-4ccc-accc-cccccccccccc', '2v2_best_ball', 50, 'in_progress'),
  ('e2000002-0000-4000-a000-000000000002', 'cccc0005-cccc-4ccc-accc-cccccccccccc', '2v2_best_ball', 50, 'in_progress')
ON CONFLICT (id) DO NOTHING;

INSERT INTO match_players (id, match_id, trip_player_id, side) VALUES
  -- Match 1: friends only
  (gen_random_uuid(), 'e2000001-0000-4000-a000-000000000001', 'b2000001-0000-4000-a000-000000000001', 'team_a'),  -- Nate
  (gen_random_uuid(), 'e2000001-0000-4000-a000-000000000001', 'b2000002-0000-4000-a000-000000000002', 'team_a'),  -- Austin
  (gen_random_uuid(), 'e2000001-0000-4000-a000-000000000001', 'b2000003-0000-4000-a000-000000000003', 'team_b'),  -- Miles
  (gen_random_uuid(), 'e2000001-0000-4000-a000-000000000001', 'b2000004-0000-4000-a000-000000000004', 'team_b'),  -- Cole
  -- Match 2: Drew (friend) + 3 non-friends
  (gen_random_uuid(), 'e2000002-0000-4000-a000-000000000002', 'b2000005-0000-4000-a000-000000000005', 'team_a'),  -- Drew (friend)
  (gen_random_uuid(), 'e2000002-0000-4000-a000-000000000002', 'b2000006-0000-4000-a000-000000000006', 'team_a'),  -- Marcus
  (gen_random_uuid(), 'e2000002-0000-4000-a000-000000000002', 'b2000007-0000-4000-a000-000000000007', 'team_b'),  -- Travis
  (gen_random_uuid(), 'e2000002-0000-4000-a000-000000000002', 'b2000008-0000-4000-a000-000000000008', 'team_b')   -- Jordan
ON CONFLICT DO NOTHING;

-- 30k. Round scores — Match 1 players thru 12 holes, Match 2 players thru 10 holes
DO $$
DECLARE
  v_course uuid := 'cccc0005-cccc-4ccc-accc-cccccccccccc';
  -- Match 1 players (12 holes)
  v_m1_tps uuid[] := ARRAY[
    'b2000001-0000-4000-a000-000000000001',  -- Nate (7.3)
    'b2000002-0000-4000-a000-000000000002',  -- Austin (11.2)
    'b2000003-0000-4000-a000-000000000003',  -- Miles (9.5)
    'b2000004-0000-4000-a000-000000000004'   -- Cole (14.0)
  ];
  v_m1_hdcp numeric[] := ARRAY[7.3, 11.2, 9.5, 14.0];
  -- Match 2 players (9 holes)
  v_m2_tps uuid[] := ARRAY[
    'b2000005-0000-4000-a000-000000000005',  -- Drew (6.8)
    'b2000006-0000-4000-a000-000000000006',  -- Marcus (12.4)
    'b2000007-0000-4000-a000-000000000007',  -- Travis (15.9)
    'b2000008-0000-4000-a000-000000000008'   -- Jordan (10.1)
  ];
  v_m2_hdcp numeric[] := ARRAY[6.8, 12.4, 15.9, 10.1];
  v_hole RECORD;
  v_seed int;
  v_adj int;
  v_score int;
  v_fwy boolean;
  v_gir_val boolean;
  v_putts_val int;
BEGIN
  -- Match 1: 4 players, holes 1-12
  FOR p IN 1..4 LOOP
    FOR v_hole IN
      SELECT id, hole_number, par FROM holes
      WHERE course_id = v_course AND hole_number <= 12
      ORDER BY hole_number
    LOOP
      v_seed := (p * 7 + v_hole.hole_number * 13 + 5 * 31) % 97;
      v_adj := CASE
        WHEN v_m1_hdcp[p] < 8 THEN
          CASE WHEN v_seed % 6 = 0 THEN -1 WHEN v_seed % 6 < 3 THEN 0 WHEN v_seed % 6 < 5 THEN 1 ELSE 0 END
        WHEN v_m1_hdcp[p] < 12 THEN
          CASE WHEN v_seed % 7 = 0 THEN -1 WHEN v_seed % 7 < 3 THEN 0 WHEN v_seed % 7 < 5 THEN 1 WHEN v_seed % 7 = 5 THEN 2 ELSE 0 END
        ELSE
          CASE WHEN v_seed % 8 = 0 THEN -1 WHEN v_seed % 8 < 3 THEN 0 WHEN v_seed % 8 < 6 THEN 1 WHEN v_seed % 8 = 6 THEN 2 ELSE 1 END
      END;
      v_score := GREATEST(1, v_hole.par + v_adj);
      v_fwy := CASE WHEN v_hole.par >= 4 THEN (v_seed % 3 <> 0) ELSE NULL END;
      v_gir_val := (v_score - 2 <= v_hole.par);
      v_putts_val := 1 + (v_seed % 3);
      IF v_putts_val > 4 THEN v_putts_val := 2; END IF;

      INSERT INTO round_scores (id, course_id, trip_player_id, hole_id, gross_score, fairway_hit, gir, putts)
      VALUES (gen_random_uuid(), v_course, v_m1_tps[p], v_hole.id, v_score, v_fwy, v_gir_val, v_putts_val)
      ON CONFLICT (course_id, trip_player_id, hole_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Match 2: 4 players, holes 1-10
  FOR p IN 1..4 LOOP
    FOR v_hole IN
      SELECT id, hole_number, par FROM holes
      WHERE course_id = v_course AND hole_number <= 10
      ORDER BY hole_number
    LOOP
      v_seed := (p * 11 + v_hole.hole_number * 17 + 3 * 29) % 97;
      v_adj := CASE
        WHEN v_m2_hdcp[p] < 8 THEN
          CASE WHEN v_seed % 6 = 0 THEN -1 WHEN v_seed % 6 < 3 THEN 0 WHEN v_seed % 6 < 5 THEN 1 ELSE 0 END
        WHEN v_m2_hdcp[p] < 12 THEN
          CASE WHEN v_seed % 7 = 0 THEN -1 WHEN v_seed % 7 < 3 THEN 0 WHEN v_seed % 7 < 5 THEN 1 WHEN v_seed % 7 = 5 THEN 2 ELSE 0 END
        WHEN v_m2_hdcp[p] < 16 THEN
          CASE WHEN v_seed % 8 = 0 THEN -1 WHEN v_seed % 8 < 3 THEN 0 WHEN v_seed % 8 < 6 THEN 1 WHEN v_seed % 8 = 6 THEN 2 ELSE 1 END
        ELSE
          CASE WHEN v_seed % 9 = 0 THEN -1 WHEN v_seed % 9 < 2 THEN 0 WHEN v_seed % 9 < 5 THEN 1 WHEN v_seed % 9 < 7 THEN 2 ELSE 3 END
      END;
      v_score := GREATEST(1, v_hole.par + v_adj);
      v_fwy := CASE WHEN v_hole.par >= 4 THEN (v_seed % 3 <> 0) ELSE NULL END;
      v_gir_val := (v_score - 2 <= v_hole.par);
      v_putts_val := 1 + (v_seed % 3);
      IF v_putts_val > 4 THEN v_putts_val := 2; END IF;

      INSERT INTO round_scores (id, course_id, trip_player_id, hole_id, gross_score, fairway_hit, gir, putts)
      VALUES (gen_random_uuid(), v_course, v_m2_tps[p], v_hole.id, v_score, v_fwy, v_gir_val, v_putts_val)
      ON CONFLICT (course_id, trip_player_id, hole_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Override hole 10 scores so Drew+Marcus (team_a) win the hole
  -- Drew gets a birdie, Travis+Jordan get bogeys
  UPDATE round_scores SET gross_score = (SELECT par - 1 FROM holes WHERE course_id = v_course AND hole_number = 10)
  WHERE course_id = v_course AND trip_player_id = v_m2_tps[1]
    AND hole_id = (SELECT id FROM holes WHERE course_id = v_course AND hole_number = 10);
  UPDATE round_scores SET gross_score = (SELECT par + 1 FROM holes WHERE course_id = v_course AND hole_number = 10)
  WHERE course_id = v_course AND trip_player_id = v_m2_tps[3]
    AND hole_id = (SELECT id FROM holes WHERE course_id = v_course AND hole_number = 10);
  UPDATE round_scores SET gross_score = (SELECT par + 1 FROM holes WHERE course_id = v_course AND hole_number = 10)
  WHERE course_id = v_course AND trip_player_id = v_m2_tps[4]
    AND hole_id = (SELECT id FROM holes WHERE course_id = v_course AND hole_number = 10);
END;
$$;

-- 30l. Friendships — Andrew ↔ 5 new friends
--      Seed user (11111111...) AND real user (d5180dfa...) both get friendships
INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at) VALUES
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','bb001111-1111-4111-a111-111111111111','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','bb002222-2222-4222-a222-222222222222','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','bb003333-3333-4333-a333-333333333333','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','bb004444-4444-4444-a444-444444444444','accepted',now(),now()),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','bb005555-5555-4555-a555-555555555555','accepted',now(),now()),
  -- Real Andrew account
  (gen_random_uuid(),'d5180dfa-8ba3-49a8-bd52-e4c67a2c7d2f','bb001111-1111-4111-a111-111111111111','accepted',now(),now()),
  (gen_random_uuid(),'d5180dfa-8ba3-49a8-bd52-e4c67a2c7d2f','bb002222-2222-4222-a222-222222222222','accepted',now(),now()),
  (gen_random_uuid(),'d5180dfa-8ba3-49a8-bd52-e4c67a2c7d2f','bb003333-3333-4333-a333-333333333333','accepted',now(),now()),
  (gen_random_uuid(),'d5180dfa-8ba3-49a8-bd52-e4c67a2c7d2f','bb004444-4444-4444-a444-444444444444','accepted',now(),now()),
  (gen_random_uuid(),'d5180dfa-8ba3-49a8-bd52-e4c67a2c7d2f','bb005555-5555-4555-a555-555555555555','accepted',now(),now())
ON CONFLICT (requester_id, addressee_id) DO NOTHING;

-- ============================================================================
-- 31. SOLO FRIEND ACTIVE ROUND — Sam Whitfield playing Torrey Pines South thru 11
--     A friend of Andrew playing a solo quick round (no match) so the
--     UserProfileCard appears in the "Friends Playing Now" section.
--
--   Auth user:    bb009999-9999-4999-a999-999999999999
--   Player:       a2000009-0000-4000-a000-000000000009
--   Trip:         cccccccc-cccc-4ccc-accc-cccccccccccc
--   Course:       cccc0006-cccc-4ccc-accc-cccccccccccc
--   Holes:        c0060001-...-000000000001  thru  c0060012 (hex)
--   Trip player:  b2000009-0000-4000-a000-000000000009
-- ============================================================================

-- 31a. Auth user
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, aud, role
) VALUES
  ('bb009999-9999-4999-a999-999999999999', 'sam@forelive.test',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Sam Whitfield"}'::jsonb, now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 31b. Player profile update
UPDATE player_profiles SET handicap_index=8.5, home_club='Torrey Pines South', preferred_tee='White', location='San Diego, California' WHERE user_id='bb009999-9999-4999-a999-999999999999';

-- 31c. Player
INSERT INTO players (id, name, email, handicap_index, user_id) VALUES
  ('a2000009-0000-4000-a000-000000000009', 'Sam Whitfield', 'sam@forelive.test', 8.5, 'bb009999-9999-4999-a999-999999999999')
ON CONFLICT (id) DO NOTHING;

-- 31d. Friendships — Andrew ↔ Sam
INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at) VALUES
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','bb009999-9999-4999-a999-999999999999','accepted',now(),now()),
  (gen_random_uuid(),'d5180dfa-8ba3-49a8-bd52-e4c67a2c7d2f','bb009999-9999-4999-a999-999999999999','accepted',now(),now())
ON CONFLICT (requester_id, addressee_id) DO NOTHING;

-- 31e. Quick round trip (Sam is owner — Andrew is NOT a member)
INSERT INTO trips (id, name, year, location, status, match_buy_in, skins_buy_in, skins_mode, handicap_mode, is_quick_round, created_by) VALUES
  ('cccccccc-cccc-4ccc-accc-cccccccccccc', 'Quick Round — Torrey Pines South', 2025, 'San Diego, CA',
   'active', 0.00, 0.00, 'net', 'static', true,
   'bb009999-9999-4999-a999-999999999999')
ON CONFLICT (id) DO NOTHING;

-- 31f. Trip member (Sam only)
INSERT INTO trip_members (id, trip_id, user_id, role) VALUES
  (gen_random_uuid(), 'cccccccc-cccc-4ccc-accc-cccccccccccc', 'bb009999-9999-4999-a999-999999999999', 'owner')
ON CONFLICT DO NOTHING;

-- 31g. Trip player
INSERT INTO trip_players (id, trip_id, player_id, paid) VALUES
  ('b2000009-0000-4000-a000-000000000009','cccccccc-cccc-4ccc-accc-cccccccccccc','a2000009-0000-4000-a000-000000000009', true)
ON CONFLICT (id) DO NOTHING;

-- 31h. Course — Torrey Pines South (18 holes)
INSERT INTO courses (id, trip_id, name, slope, rating, par, round_number, round_date, latitude, longitude) VALUES
  ('cccc0006-cccc-4ccc-accc-cccccccccccc', 'cccccccc-cccc-4ccc-accc-cccccccccccc',
   'Torrey Pines South', 143, 74.6, 72, 1, '2025-07-12', 32.8998, -117.2424)
ON CONFLICT (id) DO NOTHING;

-- 31i. Holes (18 for Torrey Pines South)
INSERT INTO holes (id, course_id, hole_number, par, handicap_index, yardage) VALUES
  ('c0060001-0000-4000-a000-000000000001','cccc0006-cccc-4ccc-accc-cccccccccccc', 1, 4, 11, '{"Blue":452,"White":423,"Gold":396}'),
  ('c0060002-0000-4000-a000-000000000002','cccc0006-cccc-4ccc-accc-cccccccccccc', 2, 4,  3, '{"Blue":389,"White":371,"Gold":348}'),
  ('c0060003-0000-4000-a000-000000000003','cccc0006-cccc-4ccc-accc-cccccccccccc', 3, 3, 15, '{"Blue":200,"White":178,"Gold":162}'),
  ('c0060004-0000-4000-a000-000000000004','cccc0006-cccc-4ccc-accc-cccccccccccc', 4, 4,  7, '{"Blue":453,"White":426,"Gold":400}'),
  ('c0060005-0000-4000-a000-000000000005','cccc0006-cccc-4ccc-accc-cccccccccccc', 5, 5,  1, '{"Blue":453,"White":435,"Gold":412}'),
  ('c0060006-0000-4000-a000-000000000006','cccc0006-cccc-4ccc-accc-cccccccccccc', 6, 4,  9, '{"Blue":515,"White":487,"Gold":460}'),
  ('c0060007-0000-4000-a000-000000000007','cccc0006-cccc-4ccc-accc-cccccccccccc', 7, 4, 13, '{"Blue":454,"White":432,"Gold":407}'),
  ('c0060008-0000-4000-a000-000000000008','cccc0006-cccc-4ccc-accc-cccccccccccc', 8, 3, 17, '{"Blue":177,"White":165,"Gold":145}'),
  ('c0060009-0000-4000-a000-000000000009','cccc0006-cccc-4ccc-accc-cccccccccccc', 9, 5,  5, '{"Blue":567,"White":540,"Gold":510}'),
  ('c006000a-0000-4000-a000-00000000000a','cccc0006-cccc-4ccc-accc-cccccccccccc',10, 4,  2, '{"Blue":455,"White":430,"Gold":405}'),
  ('c006000b-0000-4000-a000-00000000000b','cccc0006-cccc-4ccc-accc-cccccccccccc',11, 3, 16, '{"Blue":221,"White":198,"Gold":175}'),
  ('c006000c-0000-4000-a000-00000000000c','cccc0006-cccc-4ccc-accc-cccccccccccc',12, 4,  4, '{"Blue":504,"White":476,"Gold":450}'),
  ('c006000d-0000-4000-a000-00000000000d','cccc0006-cccc-4ccc-accc-cccccccccccc',13, 4, 10, '{"Blue":386,"White":370,"Gold":347}'),
  ('c006000e-0000-4000-a000-00000000000e','cccc0006-cccc-4ccc-accc-cccccccccccc',14, 4,  6, '{"Blue":435,"White":413,"Gold":388}'),
  ('c006000f-0000-4000-a000-00000000000f','cccc0006-cccc-4ccc-accc-cccccccccccc',15, 5,  8, '{"Blue":515,"White":489,"Gold":462}'),
  ('c0060010-0000-4000-a000-000000000010','cccc0006-cccc-4ccc-accc-cccccccccccc',16, 3, 18, '{"Blue":227,"White":203,"Gold":180}'),
  ('c0060011-0000-4000-a000-000000000011','cccc0006-cccc-4ccc-accc-cccccccccccc',17, 4, 14, '{"Blue":443,"White":420,"Gold":395}'),
  ('c0060012-0000-4000-a000-000000000012','cccc0006-cccc-4ccc-accc-cccccccccccc',18, 4, 12, '{"Blue":509,"White":481,"Gold":455}');

-- 31j. Player course handicap
INSERT INTO player_course_handicaps (trip_player_id, course_id, handicap_strokes) VALUES
  ('b2000009-0000-4000-a000-000000000009','cccc0006-cccc-4ccc-accc-cccccccccccc', 9)
ON CONFLICT (trip_player_id, course_id) DO NOTHING;

-- 31k. Round scores — Sam thru 11 holes (solo, NO match)
DO $$
DECLARE
  v_course uuid := 'cccc0006-cccc-4ccc-accc-cccccccccccc';
  v_tp     uuid := 'b2000009-0000-4000-a000-000000000009';
  v_hdcp   int  := 9;
  v_hole   record;
  v_seed   int;
  v_adj    int;
  v_score  int;
  v_fwy    boolean;
  v_gir_val boolean;
  v_putts_val int;
BEGIN
  FOR v_hole IN
    SELECT id, hole_number, par FROM holes
    WHERE course_id = v_course AND hole_number <= 11
    ORDER BY hole_number
  LOOP
    v_seed := (1 * 13 + v_hole.hole_number * 19 + 7 * 31) % 97;
    v_adj := CASE
      WHEN v_hdcp < 8 THEN
        CASE WHEN v_seed % 6 = 0 THEN -1 WHEN v_seed % 6 < 3 THEN 0 WHEN v_seed % 6 < 5 THEN 1 ELSE 0 END
      WHEN v_hdcp < 12 THEN
        CASE WHEN v_seed % 7 = 0 THEN -1 WHEN v_seed % 7 < 3 THEN 0 WHEN v_seed % 7 < 5 THEN 1 WHEN v_seed % 7 = 5 THEN 2 ELSE 0 END
      ELSE
        CASE WHEN v_seed % 8 = 0 THEN -1 WHEN v_seed % 8 < 3 THEN 0 WHEN v_seed % 8 < 6 THEN 1 WHEN v_seed % 8 = 6 THEN 2 ELSE 1 END
    END;
    v_score := GREATEST(1, v_hole.par + v_adj);
    v_fwy := CASE WHEN v_hole.par >= 4 THEN (v_seed % 3 <> 0) ELSE NULL END;
    v_gir_val := (v_score - 2 <= v_hole.par);
    v_putts_val := 1 + (v_seed % 3);
    IF v_putts_val > 4 THEN v_putts_val := 2; END IF;

    INSERT INTO round_scores (id, course_id, trip_player_id, hole_id, gross_score, fairway_hit, gir, putts)
    VALUES (gen_random_uuid(), v_course, v_tp, v_hole.id, v_score, v_fwy, v_gir_val, v_putts_val)
    ON CONFLICT (course_id, trip_player_id, hole_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================================
-- COURSE RATINGS (Andrew's 3 completed Monterey Cup rounds)
-- ============================================================================
INSERT INTO course_ratings (user_id, course_id, trip_id, overall_rating, condition_rating, layout_rating, value_rating) VALUES
  ('11111111-1111-1111-1111-111111111111', 'cccc0001-cccc-4ccc-accc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 10, 10, 10, 8),
  ('11111111-1111-1111-1111-111111111111', 'cccc0002-cccc-4ccc-accc-cccccccccccd', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 9, 9, 10, 9),
  ('11111111-1111-1111-1111-111111111111', 'cccc0003-cccc-4ccc-accc-ccccccccccce', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 10, 10, 10, 10)
ON CONFLICT (user_id, course_id) DO NOTHING;
