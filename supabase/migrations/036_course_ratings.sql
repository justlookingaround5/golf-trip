-- ============================================================================
-- Migration 036: Course Ratings
-- ============================================================================

CREATE TABLE course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 10),
  condition_rating SMALLINT CHECK (condition_rating BETWEEN 1 AND 10),
  layout_rating SMALLINT CHECK (layout_rating BETWEEN 1 AND 10),
  value_rating SMALLINT CHECK (value_rating BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, trip_id)
);

CREATE INDEX idx_course_ratings_course ON course_ratings(course_id);
CREATE INDEX idx_course_ratings_user ON course_ratings(user_id);

ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read course_ratings" ON course_ratings
  FOR SELECT USING (true);

-- Authenticated users can insert their own
CREATE POLICY "Users insert own course_ratings" ON course_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own
CREATE POLICY "Users update own course_ratings" ON course_ratings
  FOR UPDATE USING (auth.uid() = user_id);
