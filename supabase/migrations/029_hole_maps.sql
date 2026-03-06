-- Cache table for course hole map data (OSM polygons or generated)
CREATE TABLE IF NOT EXISTS course_hole_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_api_id integer NOT NULL,
  hole_number integer NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  source text NOT NULL CHECK (source IN ('osm', 'generated')),
  center_lat double precision,
  center_lng double precision,
  tee_polygons jsonb DEFAULT '[]',
  fairway_polygons jsonb DEFAULT '[]',
  green_polygons jsonb DEFAULT '[]',
  bunker_polygons jsonb DEFAULT '[]',
  water_polygons jsonb DEFAULT '[]',
  hole_path jsonb DEFAULT '[]',
  par integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE (golf_course_api_id, hole_number)
);

CREATE INDEX IF NOT EXISTS idx_course_hole_maps_api_id
  ON course_hole_maps (golf_course_api_id);

CREATE TABLE IF NOT EXISTS course_osm_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_api_id integer NOT NULL UNIQUE,
  osm_status text NOT NULL CHECK (osm_status IN ('found', 'not_found')),
  latitude double precision,
  longitude double precision,
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE course_hole_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_osm_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON course_hole_maps FOR SELECT USING (true);
CREATE POLICY "Auth write" ON course_hole_maps FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read" ON course_osm_cache FOR SELECT USING (true);
CREATE POLICY "Auth write" ON course_osm_cache FOR ALL USING (auth.role() = 'authenticated');
