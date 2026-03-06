/**
 * Batch scraper: Pre-fetch OSM golf course data for well-known US courses.
 *
 * Strategy: Search the golf course API for common golf terms (club names,
 * "country club", "golf club", etc.) to build a broad list, then fetch
 * OSM polygon data for each. Resumes automatically — skips courses already cached.
 *
 * Usage:
 *   npx tsx scripts/scrape-osm-courses.ts
 *   npx tsx scripts/scrape-osm-courses.ts --limit 100    (total courses to process, default 2500)
 *   npx tsx scripts/scrape-osm-courses.ts --delay 1500    (ms between OSM requests, default 1500)
 *   npx tsx scripts/scrape-osm-courses.ts --dry-run       (just search, don't fetch OSM)
 *
 * Reads env from .env.local. Resumes automatically — skips courses already in course_osm_cache.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx)
    const val = trimmed.slice(eqIdx + 1)
    if (!process.env[key]) process.env[key] = val
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GOLF_API_KEY = process.env.GOLF_COURSE_API_KEY!
const GOLF_API_BASE = 'https://api.golfcourseapi.com/v1'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// --- CLI args ---
const args = process.argv.slice(2)
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal
}
const TOTAL_LIMIT = parseInt(getArg('limit', '2500'), 10)
const DELAY_MS = parseInt(getArg('delay', '1500'), 10)
const DRY_RUN = args.includes('--dry-run')

// Search terms designed to find lots of distinct courses across the US.
// The golf course API searches by name, so we use common golf naming patterns
// plus city/region names to get geographic diversity.
const SEARCH_TERMS = [
  // Common golf naming patterns
  'Country Club', 'Golf Club', 'Golf Course', 'Golf Links',
  'Golf Resort', 'National Golf', 'Golf & Country',
  // Well-known course names / brands
  'Pebble Beach', 'TPC', 'Pinehurst', 'Torrey Pines', 'Bethpage',
  'Whistling Straits', 'Kiawah', 'Bandon', 'Sawgrass', 'Harbour Town',
  'Valhalla', 'Merion', 'Winged Foot', 'Oakmont', 'Shinnecock',
  'Congressional', 'Baltusrol', 'Muirfield', 'Medinah', 'Hazeltine',
  'Chambers Bay', 'Erin Hills', 'Quail Hollow', 'Bay Hill',
  // Top golf cities/regions for diversity
  'Scottsdale', 'Myrtle Beach', 'Palm Springs', 'Hilton Head',
  'Orlando golf', 'San Diego golf', 'Phoenix golf', 'Las Vegas golf',
  'Charleston golf', 'Savannah golf', 'Austin golf', 'Denver golf',
  'Portland golf', 'Seattle golf', 'Atlanta golf', 'Nashville golf',
  'Chicago golf', 'Detroit golf', 'Minneapolis golf', 'St Louis golf',
  'Dallas golf', 'Houston golf', 'Miami golf', 'Tampa golf',
  'Raleigh golf', 'Charlotte golf', 'Boston golf', 'New York golf',
  'Philadelphia golf', 'Pittsburgh golf', 'Cleveland golf', 'Cincinnati golf',
  'Indianapolis golf', 'Milwaukee golf', 'Kansas City golf', 'Salt Lake golf',
  // State + golf combos for broad coverage
  'Alabama golf', 'Arizona golf', 'California CC', 'Colorado golf',
  'Connecticut CC', 'Florida CC', 'Georgia golf', 'Hawaii golf',
  'Idaho golf', 'Illinois CC', 'Iowa golf', 'Kentucky golf',
  'Louisiana golf', 'Maine golf', 'Maryland golf', 'Massachusetts CC',
  'Michigan CC', 'Minnesota golf', 'Mississippi golf', 'Missouri golf',
  'Montana golf', 'Nebraska golf', 'Nevada golf', 'New Hampshire golf',
  'New Jersey CC', 'New Mexico golf', 'North Carolina CC', 'Ohio CC',
  'Oklahoma golf', 'Oregon golf', 'Pennsylvania CC', 'South Carolina golf',
  'Tennessee golf', 'Texas CC', 'Utah golf', 'Vermont golf',
  'Virginia CC', 'Washington golf', 'Wisconsin golf', 'Wyoming golf',
  // Municipal / public courses
  'Municipal Golf', 'Public Golf', 'City Golf', 'Parks Golf',
]

const US_STATE_ABBREVS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
])

function isUSState(state: string | undefined): boolean {
  if (!state) return false
  return US_STATE_ABBREVS.has(state.toUpperCase().trim())
}

// --- Helpers ---

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface CourseSearchResult {
  id: number
  club_name: string
  course_name: string
  location: {
    latitude: number
    longitude: number
    city: string
    state: string
  }
}

async function searchGolfApi(query: string): Promise<CourseSearchResult[]> {
  try {
    const res = await fetch(
      `${GOLF_API_BASE}/search?search_query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Key ${GOLF_API_KEY}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.courses || []
  } catch {
    return []
  }
}

interface OsmHoleData {
  holeNumber: number
  par: number | null
  holePath: [number, number][]
  tees: [number, number][][]
  fairways: [number, number][][]
  greens: [number, number][][]
  bunkers: [number, number][][]
  water: [number, number][][]
}

async function fetchOsmData(lat: number, lng: number): Promise<OsmHoleData[] | null> {
  const query = `[out:json][timeout:15];(way["golf"](around:1500,${lat},${lng}););out body;>;out skel qt;`
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.remark?.includes('timeout')) return null

    const nodeLookup = new Map<number, { lat: number; lng: number }>()
    for (const el of data.elements) {
      if (el.type === 'node') nodeLookup.set(el.id, { lat: el.lat, lng: el.lon })
    }

    const holeWays: any[] = [], greenWays: any[] = [], fairwayWays: any[] = []
    const bunkerWays: any[] = [], teeWays: any[] = [], waterWays: any[] = []

    for (const el of data.elements) {
      if (el.type !== 'way' || !el.tags?.golf) continue
      switch (el.tags.golf) {
        case 'hole': holeWays.push(el); break
        case 'green': greenWays.push(el); break
        case 'fairway': fairwayWays.push(el); break
        case 'bunker': bunkerWays.push(el); break
        case 'tee': teeWays.push(el); break
        case 'water_hazard': case 'lateral_water_hazard': waterWays.push(el); break
      }
    }

    if (holeWays.length === 0) return null

    function resolveNodes(nodeIds: number[]): [number, number][] {
      return nodeIds.map(id => nodeLookup.get(id)).filter(Boolean).map(n => [n!.lat, n!.lng])
    }
    function centroid(coords: [number, number][]): [number, number] {
      let la = 0, ln = 0
      for (const [a, b] of coords) { la += a; ln += b }
      return [la / coords.length, ln / coords.length]
    }
    function distance(a: [number, number], b: [number, number]): number {
      return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
    }

    const holes: OsmHoleData[] = holeWays.map(way => ({
      holeNumber: way.tags?.ref ? parseInt(way.tags.ref, 10) : 0,
      par: way.tags?.par ? parseInt(way.tags.par, 10) : null,
      holePath: resolveNodes(way.nodes),
      tees: [], fairways: [], greens: [], bunkers: [], water: [],
    }))

    function closestHole(point: [number, number], useEnd: boolean): OsmHoleData | null {
      let best: OsmHoleData | null = null, bestDist = Infinity
      for (const hole of holes) {
        if (hole.holePath.length === 0) continue
        const ref = useEnd ? hole.holePath[hole.holePath.length - 1] : hole.holePath[Math.floor(hole.holePath.length / 2)]
        const d = distance(point, ref)
        if (d < bestDist) { bestDist = d; best = hole }
      }
      return best
    }
    function assignPolygons(ways: any[], key: 'tees' | 'fairways' | 'greens' | 'bunkers') {
      for (const way of ways) {
        const coords = resolveNodes(way.nodes)
        if (coords.length === 0) continue
        const hole = closestHole(centroid(coords), true)
        if (hole) hole[key].push(coords)
      }
    }

    assignPolygons(teeWays, 'tees')
    assignPolygons(fairwayWays, 'fairways')
    assignPolygons(greenWays, 'greens')
    assignPolygons(bunkerWays, 'bunkers')
    for (const way of waterWays) {
      const coords = resolveNodes(way.nodes)
      if (coords.length === 0) continue
      const hole = closestHole(centroid(coords), false)
      if (hole) hole.water.push(coords)
    }

    holes.sort((a, b) => a.holeNumber - b.holeNumber)
    return holes
  } catch {
    return null
  }
}

async function cacheHoles(apiId: number, lat: number, lng: number, osmHoles: OsmHoleData[]) {
  const holeRows = osmHoles.map(hole => ({
    golf_course_api_id: apiId,
    hole_number: hole.holeNumber,
    source: 'osm',
    center_lat: hole.holePath.length > 0 ? hole.holePath[0][0] : lat,
    center_lng: hole.holePath.length > 0 ? hole.holePath[0][1] : lng,
    tee_polygons: JSON.stringify(hole.tees),
    fairway_polygons: JSON.stringify(hole.fairways),
    green_polygons: JSON.stringify(hole.greens),
    bunker_polygons: JSON.stringify(hole.bunkers),
    water_polygons: JSON.stringify(hole.water),
    hole_path: JSON.stringify(hole.holePath),
    par: hole.par,
  }))

  await supabase.from('course_hole_maps').upsert(holeRows, {
    onConflict: 'golf_course_api_id,hole_number',
  })
}

async function markOsmCache(apiId: number, lat: number | null, lng: number | null, status: 'found' | 'not_found') {
  await supabase.from('course_osm_cache').upsert({
    golf_course_api_id: apiId,
    osm_status: status,
    latitude: lat,
    longitude: lng,
  }, { onConflict: 'golf_course_api_id' })
}

// --- Main ---

async function main() {
  console.log('=== OSM Golf Course Scraper ===')
  console.log(`Target: up to ${TOTAL_LIMIT} courses`)
  console.log(`Delay between OSM requests: ${DELAY_MS}ms`)
  if (DRY_RUN) console.log('DRY RUN — will search but not fetch OSM data')
  console.log('')

  // Phase 1: Discover courses via golf course API
  console.log('Phase 1: Discovering courses...')
  const allCourses = new Map<number, CourseSearchResult>()

  for (const term of SEARCH_TERMS) {
    if (allCourses.size >= TOTAL_LIMIT * 2) break // Gather extra to account for skips

    const results = await searchGolfApi(term)
    for (const course of results) {
      if (
        !allCourses.has(course.id) &&
        course.location?.latitude &&
        course.location?.longitude &&
        isUSState(course.location?.state)
      ) {
        allCourses.set(course.id, course)
      }
    }
    process.stdout.write(`\r  Searched "${term}" — ${allCourses.size} unique courses found`)
    await sleep(300) // Be nice to golf API
  }

  console.log(`\n  Total unique courses discovered: ${allCourses.size}`)

  // Phase 2: Filter out already-cached courses
  console.log('\nPhase 2: Checking existing cache...')
  const courseList = Array.from(allCourses.values())
  const apiIds = courseList.map(c => c.id)

  // Batch check which are already cached (100 at a time)
  const cachedIds = new Set<number>()
  for (let i = 0; i < apiIds.length; i += 100) {
    const batch = apiIds.slice(i, i + 100)
    const { data: cached } = await supabase
      .from('course_osm_cache')
      .select('golf_course_api_id')
      .in('golf_course_api_id', batch)

    for (const row of cached || []) {
      cachedIds.add(row.golf_course_api_id)
    }
  }

  const toProcess = courseList.filter(c => !cachedIds.has(c.id)).slice(0, TOTAL_LIMIT)
  console.log(`  Already cached: ${cachedIds.size}`)
  console.log(`  To process: ${toProcess.length}`)

  if (DRY_RUN) {
    console.log('\nDry run complete. Courses that would be processed:')
    for (const c of toProcess.slice(0, 20)) {
      console.log(`  ${c.course_name || c.club_name} (${c.location.city}, ${c.location.state})`)
    }
    if (toProcess.length > 20) console.log(`  ... and ${toProcess.length - 20} more`)
    return
  }

  // Phase 3: Fetch OSM data for each course
  console.log('\nPhase 3: Fetching OSM data...')
  let found = 0, notFound = 0, errors = 0

  for (let i = 0; i < toProcess.length; i++) {
    const course = toProcess[i]
    const name = course.course_name || course.club_name
    const pct = ((i + 1) / toProcess.length * 100).toFixed(1)

    try {
      const osmHoles = await fetchOsmData(course.location.latitude, course.location.longitude)

      if (osmHoles && osmHoles.length > 0) {
        await cacheHoles(course.id, course.location.latitude, course.location.longitude, osmHoles)
        await markOsmCache(course.id, course.location.latitude, course.location.longitude, 'found')
        found++
        console.log(`  [${pct}%] ✅ ${name} (${course.location.state}) — ${osmHoles.length} holes`)
      } else {
        await markOsmCache(course.id, course.location.latitude, course.location.longitude, 'not_found')
        notFound++
        console.log(`  [${pct}%] ⬜ ${name} (${course.location.state}) — no OSM data`)
      }
    } catch (err) {
      errors++
      console.log(`  [${pct}%] ❌ ${name} — error: ${err}`)
    }

    await sleep(DELAY_MS)
  }

  console.log('\n=== Summary ===')
  console.log(`Courses with OSM data: ${found}`)
  console.log(`Courses without OSM data: ${notFound}`)
  console.log(`Errors: ${errors}`)
  console.log(`Previously cached: ${cachedIds.size}`)
  console.log(`Hit rate: ${toProcess.length > 0 ? (found / (found + notFound) * 100).toFixed(1) : 0}%`)
  console.log('Done!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
