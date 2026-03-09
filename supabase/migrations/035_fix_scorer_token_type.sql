-- scorer_token was uuid but the live scoring route stores text identifiers
-- like "live_round_<courseId>". Change to text so the upsert works.
ALTER TABLE matches ALTER COLUMN scorer_token TYPE text USING scorer_token::text;
