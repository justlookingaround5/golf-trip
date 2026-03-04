-- Add bio/trash-talk line to player profiles
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add course_votes table for collaborative course voting
CREATE TABLE IF NOT EXISTS course_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  proposed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_vote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_vote_id UUID NOT NULL REFERENCES course_votes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 0, 1)),  -- -1=no, 0=maybe, 1=yes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_vote_id, user_id)
);

-- Add date_polls table for availability polling
CREATE TABLE IF NOT EXISTS date_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date_option DATE NOT NULL,
  proposed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS date_poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_poll_id UUID NOT NULL REFERENCES date_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  available BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date_poll_id, user_id)
);

-- RLS policies
ALTER TABLE course_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_vote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read course_votes" ON course_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert course_votes" ON course_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can read course_vote_responses" ON course_vote_responses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage own course_vote_responses" ON course_vote_responses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read date_polls" ON date_polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert date_polls" ON date_polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can read date_poll_responses" ON date_poll_responses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage own date_poll_responses" ON date_poll_responses FOR ALL USING (auth.uid() = user_id);
