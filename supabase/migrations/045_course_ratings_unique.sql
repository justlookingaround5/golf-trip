-- Drop the old 3-column unique constraint
ALTER TABLE course_ratings DROP CONSTRAINT IF EXISTS course_ratings_user_id_course_id_trip_id_key;

-- Add new 2-column unique constraint (one rating per user per course)
ALTER TABLE course_ratings ADD CONSTRAINT course_ratings_user_id_course_id_key UNIQUE (user_id, course_id);
