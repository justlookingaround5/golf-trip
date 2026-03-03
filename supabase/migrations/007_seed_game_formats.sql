-- ============================================================================
-- Migration 007: Seed Game Formats
-- Tier 1 = must-have for launch, Tier 2 = popular/fun
-- ============================================================================

INSERT INTO game_formats (name, description, rules_summary, icon, scoring_type, scope, min_players, max_players, team_based, engine_key, default_config, tier) VALUES

-- TIER 1: Must-Have
('Skins',
 'Win holes outright to claim skins. Ties carry over.',
 '## Skins
Each hole is worth one "skin." The player with the sole lowest score wins the skin. If two or more players tie for lowest, the skin **carries over** to the next hole, increasing its value.

**Net vs Gross:** Configurable. Net skins apply handicap strokes per hole.

**Payout:** Total pot (buy-in × players) divided by total skins won.',
 '💰', 'strokes', 'group', 2, 20, false, 'skins',
 '{"mode": "net", "carry_over": true, "value_per_skin": null}',
 1),

('Nassau',
 'Three bets in one: front 9, back 9, and overall 18.',
 '## Nassau
Three separate match play bets on a single round:
- **Front 9** — holes 1-9
- **Back 9** — holes 10-18
- **Overall 18** — full round

Each bet is worth the agreed amount. Player with lower net score on each segment wins that bet.

**Presses:** When a player is 2-down in any bet, they can "press" — starting a new bet from that hole forward within the segment. Presses can be automatic or manual.

**Payout:** Each bet pays independently. A player can win front, lose back, and tie overall.',
 '🏌️', 'match', 'foursome', 2, 4, false, 'nassau',
 '{"bet_amount": 5, "auto_press": true, "press_trigger": 2, "press_amount": null}',
 1),

('Best Ball',
 'Team game — lowest net score from each team counts.',
 '## Best Ball
Teams of 2 (or more). Each player plays their own ball. On each hole, the **lowest net score** from each team is compared. Lower team score wins the hole.

Can be scored as match play (holes won/lost) or stroke play (total strokes).

**Handicap:** Full course handicap applied.',
 '⭐', 'match', 'foursome', 4, 8, true, 'best_ball',
 '{"scoring": "match_play", "handicap_pct": 100}',
 1),

('Match Play',
 'Head-to-head, hole by hole. Win holes, not strokes.',
 '## Match Play
Two players (or two teams) compete hole-by-hole. The player/team with the lower net score **wins the hole**. Equal scores = hole is "halved."

The match status is tracked as holes up/down: "2UP" means leading by 2 holes. Match ends when one side is up by more holes than remain (e.g., "3&2" = 3 up with 2 to play).

**Handicap:** Difference between players'' course handicaps. Lower handicap gives strokes to higher.',
 '🤝', 'match', 'foursome', 2, 2, false, 'match_play',
 '{"handicap_pct": 100}',
 1),

('Stroke Play',
 'Lowest total score wins. Simple as it gets.',
 '## Stroke Play
Every stroke counts. Lowest total score (gross or net) over the round wins.

**Net Stroke Play:** Course handicap subtracted from gross total. Levels the playing field.

**Payout:** Can be structured as winner-take-all, top-3, or proportional.',
 '📊', 'strokes', 'group', 2, 20, false, 'stroke_play',
 '{"mode": "net", "payout_structure": "top_3"}',
 1),

('Scramble',
 'Team picks the best shot each time. Everyone plays from there.',
 '## Scramble
Teams of 2-4. On each shot, the team picks the **best result** and all players play their next shot from that spot.

**Scoring:** One team score per hole. Lowest team total wins.

**Handicap:** Typically a percentage of combined team handicap (e.g., 25% of total or 35% of lowest + 15% of highest).

Note: The app tracks final team score per hole. Shot selection happens on course.',
 '🏆', 'strokes', 'foursome', 4, 20, true, 'scramble',
 '{"handicap_formula": "25pct_combined"}',
 1),

-- TIER 2: Games That Create Stories
('Wolf',
 'Rotating "Wolf" picks a partner or goes lone. High risk, high reward.',
 '## Wolf
Rotating player order each hole. The **Wolf** (first to tee off that hole) watches each subsequent player''s tee shot and decides:
- **Pick a partner** immediately after someone''s shot (can''t go back)
- **Go Lone Wolf** after seeing all shots — plays 1 vs 3 for double points
- **Blind Wolf** — declares Lone Wolf before anyone tees off for triple points

**Scoring:** Points per hole. Wolf+partner vs other two, or Lone Wolf vs field.

**Rotation:** Player order rotates each hole (1-2-3-4, 2-3-4-1, etc.).',
 '🐺', 'points', 'foursome', 4, 5, false, 'wolf',
 '{"point_value": 1, "lone_wolf_multiplier": 2, "blind_wolf_multiplier": 3}',
 2),

('Stableford',
 'Points for scores relative to par. Rewards birdies, ignores blowups.',
 '## Stableford
Points awarded per hole based on net score relative to par:
- Double Eagle or better: **5 points**
- Eagle: **4 points**
- Birdie: **3 points**
- Par: **2 points**
- Bogey: **1 point**
- Double Bogey or worse: **0 points**

**Highest total points wins.** Great equalizer — one bad hole doesn''t ruin your round.',
 '🎯', 'points', 'group', 2, 20, false, 'stableford',
 '{"modified": false, "point_scale": {"double_eagle_plus": 5, "eagle": 4, "birdie": 3, "par": 2, "bogey": 1, "double_bogey_plus": 0}}',
 2),

('Vegas',
 'Team scores combined as a two-digit number. Swings get wild.',
 '## Vegas (Daytona)
Two 2-player teams. On each hole, each team combines their scores into a **two-digit number** — lower score first.

Example: Team A scores 4 and 5 → **45**. Team B scores 3 and 6 → **36**. Difference: 45 - 36 = 9 points to Team B.

**The Flip:** If a player on a team makes birdie or better, the opposing team must put their **higher number first** (6 and 3 → **63** instead of 36). Swings can be massive.

**Payout:** Points multiplied by agreed $ value.',
 '🎰', 'points', 'foursome', 4, 4, true, 'vegas',
 '{"point_value": 0.25, "flip_on_birdie": true}',
 2),

('Banker',
 'One player "banks" each hole — sets the bet, others must match.',
 '## Banker
3-6 players. One player is the **Banker** each hole (rotates). The Banker sets a point value. Each other player plays against the Banker:
- Beat the Banker = win the point value
- Lose to Banker = pay the point value
- Tie = push

**Doubles:** If Banker has the best score, they collect from everyone. If Banker has the worst, they pay everyone double.

**Rotation:** Banker rotates each hole.',
 '🏦', 'points', 'foursome', 3, 6, false, 'banker',
 '{"base_value": 1, "double_on_worst": true}',
 2),

('Hammer',
 'Press game on steroids. Opponent can "hammer" to double the stakes.',
 '## Hammer
2-4 players. A match play bet where either side can **Hammer** (double the current stakes) at any point during a hole.

The other side must either **accept** (play at double) or **drop** (concede the hole at current value).

Multiple hammers per hole are allowed — stakes can escalate quickly.

**Payout:** Track cumulative points × value.',
 '🔨', 'match', 'foursome', 2, 4, false, 'hammer',
 '{"base_value": 1, "max_hammers_per_hole": null}',
 2),

('Nine Point',
 'Three players, 9 points per hole. 5-3-1 or 4-3-2 split.',
 '## Nine Point (5-3-1)
Exactly 3 players. Each hole awards **9 total points**:
- Best net score: **5 points**
- Middle net score: **3 points**
- Worst net score: **1 point**

If two tie for best: 4-4-1. If two tie for worst: 5-2-2. All three tie: 3-3-3.

**Payout:** (Points - 27) × value per point after 9 holes. Par is 27 points (3 per hole × 9 holes).',
 '9️⃣', 'points', 'foursome', 3, 3, false, 'nine_point',
 '{"point_split": [5, 3, 1], "value_per_point": 1}',
 2);
