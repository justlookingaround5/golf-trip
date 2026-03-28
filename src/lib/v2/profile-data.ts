import { createClient } from '@/lib/supabase/server'
import type { PlayerV2, CoursePinV2, TripV2 } from './types'

export interface MyProfileData {
  me: PlayerV2
  friendCount: number
  pins: CoursePinV2[]
  activeTrips: TripV2[]
  upcomingTrips: TripV2[]
  pastTrips: TripV2[]
  homeCourse: { name: string; latitude: number; longitude: number } | null
}

export interface UserProfileData {
  user: PlayerV2
  currentUserId: string | null
  friendCount: number
  pins: CoursePinV2[]
  activeTrips: TripV2[]
  upcomingTrips: TripV2[]
  pastTrips: TripV2[]
  friendshipStatus: 'none' | 'pending' | 'accepted'
  friendshipId: string | null
}

export async function getMyProfileData(): Promise<MyProfileData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Profile + player
  const [{ data: profile }, { data: player }] = await Promise.all([
    supabase.from('player_profiles').select('display_name, avatar_url, handicap_index, location, home_club, home_club_latitude, home_club_longitude').eq('user_id', user.id).maybeSingle(),
    supabase.from('players').select('id, name, handicap_index').eq('user_id', user.id).maybeSingle(),
  ])

  const me: PlayerV2 = {
    id: user.id,
    name: profile?.display_name ?? player?.name ?? 'Player',
    avatarUrl: profile?.avatar_url ?? null,
    handicap: profile?.handicap_index ?? player?.handicap_index ?? null,
    location: profile?.location ?? null,
  }

  const homeCourse = profile?.home_club && profile?.home_club_latitude != null && profile?.home_club_longitude != null
    ? { name: profile.home_club as string, latitude: profile.home_club_latitude as number, longitude: profile.home_club_longitude as number }
    : null

  // Friend count
  const { count: friendCount } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  // Course pins: get all courses this user has played (via trip_players → round_scores)
  const pins = await getUserCoursePins(supabase, user.id, player?.id ?? null)

  // Trips
  const { activeTrips, upcomingTrips, pastTrips } = await getUserTrips(supabase, user.id)

  return { me, friendCount: friendCount ?? 0, pins, activeTrips, upcomingTrips, pastTrips, homeCourse }
}

export async function getUserProfileData(targetUserId: string): Promise<UserProfileData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Profile + player for target
  const [{ data: profile }, { data: player }] = await Promise.all([
    supabase.from('player_profiles').select('display_name, avatar_url, handicap_index, location').eq('user_id', targetUserId).maybeSingle(),
    supabase.from('players').select('id, name, handicap_index').eq('user_id', targetUserId).maybeSingle(),
  ])

  const targetPlayer: PlayerV2 = {
    id: targetUserId,
    name: profile?.display_name ?? player?.name ?? 'Player',
    avatarUrl: profile?.avatar_url ?? null,
    handicap: profile?.handicap_index ?? player?.handicap_index ?? null,
    location: profile?.location ?? null,
  }

  // Friend count for target
  const { count: friendCount } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .or(`requester_id.eq.${targetUserId},addressee_id.eq.${targetUserId}`)
    .eq('status', 'accepted')

  // Friendship status with viewer
  let friendshipStatus: 'none' | 'pending' | 'accepted' = 'none'
  let friendshipId: string | null = null
  if (user && user.id !== targetUserId) {
    const { data: fs } = await supabase
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`
      )
      .maybeSingle()
    if (fs) {
      friendshipStatus = fs.status as 'pending' | 'accepted'
      friendshipId = fs.id
    }
  }

  const pins = await getUserCoursePins(supabase, targetUserId, player?.id ?? null)
  const { activeTrips, upcomingTrips, pastTrips } = await getUserTrips(supabase, targetUserId)

  return { user: targetPlayer, currentUserId: user?.id ?? null, friendCount: friendCount ?? 0, pins, activeTrips, upcomingTrips, pastTrips, friendshipStatus, friendshipId }
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserCoursePins(supabase: any, userId: string, playerId: string | null): Promise<CoursePinV2[]> {
  if (!playerId) return []

  // Find trip_player records for this player
  const { data: tps } = await supabase
    .from('trip_players')
    .select('id, trip_id')
    .eq('player_id', playerId)

  if (!tps || tps.length === 0) return []

  const tpIds = tps.map((tp: { id: string }) => tp.id)
  const tripIds = tps.map((tp: { trip_id: string }) => tp.trip_id)

  // Get round_stats for completed rounds (18 holes only)
  const { data: stats } = await supabase
    .from('round_stats')
    .select('course_id, trip_player_id, gross_total, net_total, par_total, holes_played, computed_at')
    .in('trip_player_id', tpIds)
    .eq('holes_played', 18)

  if (!stats || stats.length === 0) return []

  // Get courses
  const courseIds = [...new Set(stats.map((s: { course_id: string }) => s.course_id))]
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, par, trip_id, latitude, longitude, golf_course_api_id')
    .in('id', courseIds)

  // Get trips for names
  const { data: trips } = await supabase
    .from('trips')
    .select('id, name')
    .in('id', tripIds)

  const courseMap = new Map((courses ?? []).map((c: { id: string; name: string; par: number; trip_id: string; latitude: number | null; longitude: number | null }) => [c.id, c]))
  const tripMap = new Map((trips ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
  const tpToTrip = new Map(tps.map((tp: { id: string; trip_id: string }) => [tp.id, tp.trip_id]))

  type CourseRow = { id: string; name: string; par: number; trip_id: string; latitude: number | null; longitude: number | null; golf_course_api_id: number | null }
  const pins: CoursePinV2[] = []
  for (const s of stats) {
    const course = courseMap.get(s.course_id) as CourseRow | undefined
    if (!course || !course.latitude || !course.longitude) continue
    const tripId = tpToTrip.get(s.trip_player_id)
    pins.push({
      courseId: s.course_id,
      courseName: course.name,
      date: s.computed_at?.split('T')[0] ?? '',
      grossScore: s.gross_total,
      netScore: s.net_total,
      par: s.par_total ?? course.par ?? 72,
      tripName: tripId ? ((tripMap.get(tripId) as string | undefined) ?? null) : null,
      rating: null,
      latitude: course.latitude,
      longitude: course.longitude,
      roundId: s.course_id,
    })
  }

  // Deduplicate: keep only most recent round per course
  // Group by golf_course_api_id (stable identity) or courseName (fallback)
  const courseKeyMap = new Map<string, CoursePinV2[]>()
  for (const pin of pins) {
    const course = courseMap.get(pin.courseId) as CourseRow | undefined
    const key = course?.golf_course_api_id
      ? `api:${course.golf_course_api_id}`
      : `name:${pin.courseName}`
    const group = courseKeyMap.get(key) || []
    group.push(pin)
    courseKeyMap.set(key, group)
  }

  const dedupedPins: CoursePinV2[] = []
  for (const group of courseKeyMap.values()) {
    // Sort by date descending, keep the most recent
    group.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    dedupedPins.push(group[0])
  }

  // Populate ratings from course_ratings table
  const dedupedCourseIds = dedupedPins.map(p => p.courseId)
  if (dedupedCourseIds.length > 0) {
    const { data: ratings } = await supabase
      .from('course_ratings')
      .select('course_id, overall_rating')
      .eq('user_id', userId)
      .in('course_id', dedupedCourseIds)

    if (ratings && ratings.length > 0) {
      const ratingMap = new Map(ratings.map((r: { course_id: string; overall_rating: number }) => [r.course_id, r.overall_rating as number]))
      for (const pin of dedupedPins) {
        pin.rating = (ratingMap.get(pin.courseId) as number | undefined) ?? null
      }
    }
  }

  return dedupedPins
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserTrips(supabase: any, userId: string): Promise<{ activeTrips: TripV2[]; upcomingTrips: TripV2[]; pastTrips: TripV2[] }> {
  // Get trips where user is a member
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', userId)

  if (!memberships || memberships.length === 0) return { activeTrips: [], upcomingTrips: [], pastTrips: [] }

  const tripIds = memberships.map((m: { trip_id: string }) => m.trip_id)

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, location, status, created_at')
    .in('id', tripIds)
    .order('created_at', { ascending: false })

  if (!trips) return { activeTrips: [], upcomingTrips: [], pastTrips: [] }

  // Get player counts per trip
  const { data: memberCounts } = await supabase
    .from('trip_members')
    .select('trip_id')
    .in('trip_id', tripIds)

  const countByTrip = new Map<string, number>()
  for (const m of memberCounts ?? []) {
    countByTrip.set(m.trip_id, (countByTrip.get(m.trip_id) ?? 0) + 1)
  }

  const mapTrip = (t: { id: string; name: string; location: string | null; status: string }): TripV2 => ({
    id: t.id,
    name: t.name,
    location: t.location,
    startDate: null,
    endDate: null,
    status: t.status as TripV2['status'],
    playerCount: countByTrip.get(t.id) ?? 0,
    players: [],
  })

  const activeTrips = trips.filter((t: { status: string }) => t.status === 'active').map(mapTrip)
  const upcomingTrips = trips.filter((t: { status: string }) => t.status === 'setup').map(mapTrip)
  const pastTrips = trips.filter((t: { status: string }) => t.status === 'completed').map(mapTrip)

  return { activeTrips, upcomingTrips, pastTrips }
}
