import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { fetchOsmGolfData } from '@/lib/osm-golf'
import { searchCourses } from '@/lib/golf-course-api'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name, golf_course_api_id')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const apiId = course.golf_course_api_id

  // No API id means manual course -- no maps available
  if (!apiId) {
    return NextResponse.json({ holes: [], source: 'none' })
  }

  const serviceClient = getServiceClient()

  // Check for cached hole maps
  const { data: cachedHoles } = await serviceClient
    .from('course_hole_maps')
    .select('*')
    .eq('golf_course_api_id', apiId)
    .order('hole_number', { ascending: true })

  if (cachedHoles && cachedHoles.length > 0) {
    return NextResponse.json({
      holes: cachedHoles.map(formatHoleFromDb),
      source: 'osm',
    })
  }

  // Check OSM cache status
  const { data: osmCache } = await serviceClient
    .from('course_osm_cache')
    .select('*')
    .eq('golf_course_api_id', apiId)
    .single()

  if (osmCache?.osm_status === 'not_found') {
    return NextResponse.json({ holes: [], source: 'not_found' })
  }

  // Need to fetch from OSM -- first get coordinates
  let lat: number | null = osmCache?.latitude ?? null
  let lng: number | null = osmCache?.longitude ?? null

  if (lat === null || lng === null) {
    try {
      const results = await searchCourses(course.name)
      if (results.length > 0) {
        lat = results[0].location.latitude
        lng = results[0].location.longitude
      }
    } catch {
      // search failed, fall through
    }
  }

  if (lat === null || lng === null) {
    // No coordinates found -- mark as not_found
    await serviceClient.from('course_osm_cache').upsert({
      golf_course_api_id: apiId,
      osm_status: 'not_found',
      latitude: null,
      longitude: null,
    }, { onConflict: 'golf_course_api_id' })

    return NextResponse.json({ holes: [], source: 'not_found' })
  }

  // Fetch OSM data
  try {
    const osmHoles = await fetchOsmGolfData(lat, lng)

    if (!osmHoles || osmHoles.length === 0) {
      await serviceClient.from('course_osm_cache').upsert({
        golf_course_api_id: apiId,
        osm_status: 'not_found',
        latitude: lat,
        longitude: lng,
      }, { onConflict: 'golf_course_api_id' })

      return NextResponse.json({ holes: [], source: 'not_found' })
    }

    // Cache the OSM status
    await serviceClient.from('course_osm_cache').upsert({
      golf_course_api_id: apiId,
      osm_status: 'found',
      latitude: lat,
      longitude: lng,
    }, { onConflict: 'golf_course_api_id' })

    // Cache each hole
    const holeRows = osmHoles.map((hole) => {
      const centerLat = hole.holePath.length > 0 ? hole.holePath[0][0] : lat!
      const centerLng = hole.holePath.length > 0 ? hole.holePath[0][1] : lng!

      return {
        golf_course_api_id: apiId,
        hole_number: hole.holeNumber,
        source: 'osm',
        center_lat: centerLat,
        center_lng: centerLng,
        tee_polygons: JSON.stringify(hole.tees),
        fairway_polygons: JSON.stringify(hole.fairways),
        green_polygons: JSON.stringify(hole.greens),
        bunker_polygons: JSON.stringify(hole.bunkers),
        water_polygons: JSON.stringify(hole.water),
        hole_path: JSON.stringify(hole.holePath),
        par: hole.par,
      }
    })

    await serviceClient.from('course_hole_maps').upsert(holeRows, {
      onConflict: 'golf_course_api_id,hole_number',
    })

    return NextResponse.json({
      holes: osmHoles.map((hole) => ({
        holeNumber: hole.holeNumber,
        source: 'osm',
        holePath: hole.holePath,
        tees: hole.tees,
        fairways: hole.fairways,
        greens: hole.greens,
        bunkers: hole.bunkers,
        water: hole.water,
      })),
      source: 'osm',
    })
  } catch (err) {
    console.error('Error fetching OSM golf data:', err)
    return NextResponse.json(
      { error: 'Failed to fetch hole map data' },
      { status: 500 }
    )
  }
}

function formatHoleFromDb(row: Record<string, unknown>) {
  return {
    holeNumber: row.hole_number,
    source: row.source,
    holePath: typeof row.hole_path === 'string' ? JSON.parse(row.hole_path) : row.hole_path ?? [],
    tees: typeof row.tee_polygons === 'string' ? JSON.parse(row.tee_polygons) : row.tee_polygons ?? [],
    fairways: typeof row.fairway_polygons === 'string' ? JSON.parse(row.fairway_polygons) : row.fairway_polygons ?? [],
    greens: typeof row.green_polygons === 'string' ? JSON.parse(row.green_polygons) : row.green_polygons ?? [],
    bunkers: typeof row.bunker_polygons === 'string' ? JSON.parse(row.bunker_polygons) : row.bunker_polygons ?? [],
    water: typeof row.water_polygons === 'string' ? JSON.parse(row.water_polygons) : row.water_polygons ?? [],
  }
}
