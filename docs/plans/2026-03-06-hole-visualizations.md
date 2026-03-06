# Hole Visualizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show visual hole maps (fairways, greens, bunkers, water) on each hole during live scoring, with cached data to avoid repeated lookups.

**Architecture:** Three-tier lookup: (1) Check Supabase `course_hole_maps` cache first. (2) If miss, fetch real polygon data from OpenStreetMap Overpass API using the course's lat/lng from golfcourseapi.com. (3) If OSM has no data, generate a stylized SVG based on par/yardage. Cache all results in Supabase so each course is only fetched once. The SVG rendering is a client component that takes polygon data or generated shapes and renders them inline.

**Tech Stack:** Supabase (cache table), OpenStreetMap Overpass API (free, no key), golfcourseapi.com (existing key), React SVG components, Next.js API route.

---

### Task 1: Database — Create cache table for hole map data

**Files:**
- Create: `supabase/migrations/029_hole_maps.sql`

**Step 1: Write the migration**

```sql
-- Cache table for course hole map data (OSM polygons or generated)
CREATE TABLE IF NOT EXISTS course_hole_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_api_id integer NOT NULL,
  hole_number integer NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  source text NOT NULL CHECK (source IN ('osm', 'generated')),
  -- The center point for this hole (tee midpoint)
  center_lat double precision,
  center_lng double precision,
  -- All geometry stored as GeoJSON-style arrays
  -- Each is an array of {type, coordinates} objects
  tee_polygons jsonb DEFAULT '[]',
  fairway_polygons jsonb DEFAULT '[]',
  green_polygons jsonb DEFAULT '[]',
  bunker_polygons jsonb DEFAULT '[]',
  water_polygons jsonb DEFAULT '[]',
  -- The hole path from tee to green (array of [lat, lng])
  hole_path jsonb DEFAULT '[]',
  par integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE (golf_course_api_id, hole_number)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_course_hole_maps_api_id
  ON course_hole_maps (golf_course_api_id);

-- Also cache course-level OSM metadata so we know if we've already tried
CREATE TABLE IF NOT EXISTS course_osm_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_api_id integer NOT NULL UNIQUE,
  osm_status text NOT NULL CHECK (osm_status IN ('found', 'not_found')),
  latitude double precision,
  longitude double precision,
  fetched_at timestamptz DEFAULT now()
);

-- RLS: public read, authenticated write
ALTER TABLE course_hole_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_osm_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON course_hole_maps FOR SELECT USING (true);
CREATE POLICY "Auth write" ON course_hole_maps FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read" ON course_osm_cache FOR SELECT USING (true);
CREATE POLICY "Auth write" ON course_osm_cache FOR ALL USING (auth.role() = 'authenticated');
```

**Step 2: Run the migration in Supabase**

Run the SQL in the Supabase dashboard (project ref: `nwuyibrjzoyhzaqnzodb`) or via CLI.

**Step 3: Commit**

```bash
git add supabase/migrations/029_hole_maps.sql
git commit -m "feat: add course_hole_maps and course_osm_cache tables"
```

---

### Task 2: API — OSM data fetcher service

**Files:**
- Create: `src/lib/osm-golf.ts`

This module queries the OpenStreetMap Overpass API for golf features near a given lat/lng, then assigns polygons to holes by proximity to each hole's path.

**Step 1: Create the OSM fetcher**

The module should export:
- `fetchOsmGolfData(lat: number, lng: number): Promise<OsmGolfData | null>` — fetches all golf features within 1500m of the coordinates
- Internal logic to parse Overpass JSON into typed arrays of polygons
- Assign each green/fairway/bunker/tee/water polygon to the nearest hole by comparing polygon centroids to hole path endpoints

Key implementation details:
- Overpass query: `[out:json][timeout:15];(way["golf"](around:1500,{lat},{lng}););out body;>;out skel qt;`
- Parse nodes into a lookup map, then resolve way node IDs to coordinates
- Group features by `tags.golf` value: `hole`, `green`, `fairway`, `bunker`, `tee`, `water_hazard`, `lateral_water_hazard`
- For each hole way, extract ref (hole number) and the path coordinates
- For each polygon feature, compute centroid and find the closest hole path endpoint (green end) to assign it
- Return structured data per hole: `{ holeNumber, par, holePath, tees, fairways, greens, bunkers, water }`

**Step 2: Commit**

```bash
git add src/lib/osm-golf.ts
git commit -m "feat: add OSM golf course data fetcher"
```

---

### Task 3: SVG — Generated hole diagram fallback

**Files:**
- Create: `src/components/HoleDiagram.tsx`

A React component that renders an SVG hole visualization. It accepts either:
- Real polygon data (from OSM cache) — renders actual shapes
- Nothing — generates a stylized diagram based on par and yardage

**Step 1: Create the component**

The component should:
- Accept props: `{ par, yardage?, holeNumber, polygons?: CachedHoleMap }`
- When `polygons` has real data (source='osm'): project lat/lng coordinates to SVG viewBox space using a local mercator projection, then render each polygon type with appropriate colors:
  - Fairway: `#4a7c59` (green)
  - Green: `#5cb85c` (lighter green)
  - Bunker: `#e8d5a3` (sand)
  - Water: `#6ba3d6` (blue)
  - Tee: `#3d6b4f` (dark green)
  - Hole path: dashed white line
  - Background: `#2d5a1e` (rough/trees)
- When no polygons: generate a stylized shape based on par:
  - Par 3: Short, straight hole with small green
  - Par 4: Medium length, slight dogleg (direction varies by hole number)
  - Par 5: Long, pronounced dogleg with fairway bunkers
  - Scale width/length by yardage
  - Add procedural bunkers and a water hazard on ~30% of holes (seeded by holeNumber for consistency)
- Render at a fixed aspect ratio (roughly 3:4 portrait) that fits above the score input area
- Keep it compact — roughly 150-200px tall on mobile

**Step 2: Commit**

```bash
git add src/components/HoleDiagram.tsx
git commit -m "feat: add HoleDiagram SVG component with OSM and generated modes"
```

---

### Task 4: API — Hole map data endpoint with caching

**Files:**
- Create: `src/app/api/courses/[courseId]/hole-maps/route.ts`

**Step 1: Create the API route**

This endpoint:
1. Looks up the course's `golf_course_api_id` from the `courses` table
2. Checks `course_osm_cache` — if `not_found`, skip to generated fallback
3. Checks `course_hole_maps` — if rows exist for this API ID, return them
4. If cache miss: get course lat/lng from golfcourseapi.com (existing `getCourseDetail` function — extend the interface to include `location.latitude/longitude` from the search results)
5. Fetch OSM data using `fetchOsmGolfData(lat, lng)`
6. If OSM has hole data: insert into `course_hole_maps` with source='osm', update `course_osm_cache` to 'found'
7. If OSM has no data: insert generated placeholder data with source='generated', update `course_osm_cache` to 'not_found'
8. Return the hole map data as JSON

Use the Supabase service role client for writes (same pattern as the live scores route).

Response shape:
```json
{
  "holes": [
    {
      "holeNumber": 1,
      "source": "osm",
      "centerLat": 43.012,
      "centerLng": -85.495,
      "holePath": [[lat, lng], ...],
      "tees": [[[lat, lng], ...]],
      "fairways": [[[lat, lng], ...]],
      "greens": [[[lat, lng], ...]],
      "bunkers": [[[lat, lng], ...]],
      "water": [[[lat, lng], ...]]
    }
  ]
}
```

**Step 2: Commit**

```bash
git add src/app/api/courses/[courseId]/hole-maps/route.ts
git commit -m "feat: add hole-maps API with OSM fetch and DB caching"
```

---

### Task 5: Update golf-course-api.ts to include location coordinates

**Files:**
- Modify: `src/lib/golf-course-api.ts`

**Step 1: Update the interfaces and search response**

The search results from golfcourseapi.com already return `location.latitude` and `location.longitude` (confirmed via live API call). Update the `GolfCourseSearchResult` and `GolfCourseDetail` interfaces to include these fields. Also update the quick-round route to store lat/lng when creating courses so we have them available.

**Step 2: Commit**

```bash
git add src/lib/golf-course-api.ts
git commit -m "feat: include lat/lng in golf course API types"
```

---

### Task 6: Wire HoleDiagram into HoleView

**Files:**
- Modify: `src/app/trip/[tripId]/live/[courseId]/components/HoleView.tsx`
- Modify: `src/app/trip/[tripId]/live/[courseId]/live-scoring-client.tsx`

**Step 1: Add hole map data fetching to live-scoring-client**

- Add state: `const [holeMaps, setHoleMaps] = useState<Record<number, HoleMapData>>({})`
- On mount, if the course has a `golf_course_api_id`, fetch `/api/courses/${courseId}/hole-maps`
- Store the response indexed by hole number
- Pass the current hole's map data to `HoleView`

**Step 2: Add HoleDiagram to HoleView**

- Import `HoleDiagram` component
- Render it between the `CourseInfoBar` and the score entry area
- Pass the hole's polygon data (if available), par, yardage, and hole number
- Keep it compact so it doesn't push the score input too far down on mobile

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: wire hole diagrams into live scoring UI"
```

---

### Task 7: Store coordinates on courses table for future lookups

**Files:**
- Create: `supabase/migrations/030_course_coordinates.sql`
- Modify: `src/app/api/quick-round/route.ts`

**Step 1: Add lat/lng columns to courses**

```sql
ALTER TABLE courses ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS longitude double precision;
```

**Step 2: Update quick-round route to save coordinates**

When creating a course from a golfcourseapi.com search result, also save the latitude and longitude from the search result.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: store course lat/lng for hole map lookups"
```

---

### Task 8: Type-check, test, and push

**Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Fix any type errors.

**Step 2: Manual test flow**

1. Start a quick round with Egypt Valley CC (known to have OSM data)
2. Verify hole diagrams appear with real fairway/green/bunker shapes
3. Navigate through holes — each should show a different diagram
4. Start a quick round with a manual course name (no API course)
5. Verify generated SVG diagrams appear as fallback
6. Reload the Egypt Valley round — verify data loads from cache (fast, no Overpass call)

**Step 3: Push**

```bash
git push origin main
```
