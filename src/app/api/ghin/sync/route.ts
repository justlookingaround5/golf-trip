import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/ghin/sync?tripId=xxx
 *
 * Syncs handicap indexes for all players with GHIN numbers.
 * Uses the public GHIN directory endpoint for index lookup.
 */
export async function POST(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get('tripId')
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get all player profiles with GHIN numbers
  const { data: profiles, error } = await supabase
    .from('player_profiles')
    .select('user_id, ghin_number, handicap_index, display_name')
    .not('ghin_number', 'is', null)

  if (error || !profiles) {
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  const results: { name: string; old_index: number | null; new_index: number | null; status: string }[] = []

  for (const profile of profiles) {
    if (!profile.ghin_number) continue

    try {
      const res = await fetch(
        `https://api.ghin.com/api/v1/golfers.json?golfer_id=${encodeURIComponent(profile.ghin_number)}&from_golfer=false`,
        { headers: { 'Content-Type': 'application/json' } }
      )

      if (!res.ok) {
        results.push({
          name: profile.display_name || profile.ghin_number,
          old_index: profile.handicap_index,
          new_index: null,
          status: 'lookup_failed',
        })
        continue
      }

      const data = await res.json()
      const golfer = data?.golfers?.[0]
      const newIndex = golfer?.handicap_index != null ? parseFloat(golfer.handicap_index) : null

      if (newIndex != null && newIndex !== profile.handicap_index) {
        await supabase
          .from('player_profiles')
          .update({ handicap_index: newIndex })
          .eq('user_id', profile.user_id)

        await supabase
          .from('players')
          .update({ handicap_index: newIndex })
          .eq('user_id', profile.user_id)

        results.push({
          name: profile.display_name || profile.ghin_number,
          old_index: profile.handicap_index,
          new_index: newIndex,
          status: 'updated',
        })
      } else {
        results.push({
          name: profile.display_name || profile.ghin_number,
          old_index: profile.handicap_index,
          new_index: newIndex,
          status: 'unchanged',
        })
      }
    } catch {
      results.push({
        name: profile.display_name || profile.ghin_number,
        old_index: profile.handicap_index,
        new_index: null,
        status: 'error',
      })
    }
  }

  // If tripId provided, trigger stats recomputation directly (no fetch-to-self)
  if (tripId && results.some(r => r.status === 'updated')) {
    try {
      const { computeRoundStats, computeTripStats, computeAwards } = await import('@/lib/stats')
      const { getStrokesPerHole } = await import('@/lib/handicap')

      const { data: tripPlayers } = await supabase
        .from('trip_players')
        .select('id, player:players(id, name)')
        .eq('trip_id', tripId)

      const { data: courses } = await supabase
        .from('courses')
        .select('id, par, holes(id, hole_number, par, handicap_index)')
        .eq('trip_id', tripId)

      if (tripPlayers?.length && courses?.length) {
        const tpIds = tripPlayers.map(tp => tp.id)
        const allHoleIds = courses.flatMap(c => (c.holes || []).map((h: { id: string }) => h.id))

        const [scoresRes, hcpRes] = await Promise.all([
          supabase.from('scores').select('trip_player_id, hole_id, gross_score').in('trip_player_id', tpIds).in('hole_id', allHoleIds),
          supabase.from('player_course_handicaps').select('trip_player_id, course_id, handicap_strokes').in('trip_player_id', tpIds),
        ])

        const allRoundStats: Record<string, ReturnType<typeof computeRoundStats>[]> = {}
        for (const tp of tripPlayers) {
          allRoundStats[tp.id] = []
          for (const course of courses) {
            const holes = (course.holes || []).map((h: { id: string; hole_number: number; par: number; handicap_index: number }) => ({ ...h, course_id: course.id }))
            const ch = (hcpRes.data || []).find(c => c.trip_player_id === tp.id && c.course_id === course.id)
            const strokesMap = getStrokesPerHole(ch?.handicap_strokes ?? 0, holes)
            allRoundStats[tp.id].push(computeRoundStats(course.id, tp.id, scoresRes.data || [], holes, strokesMap))
          }
        }

        // Upsert trip stats
        const tripStatsRecords = tripPlayers
          .map(tp => ({ ...computeTripStats(tripId, tp.id, allRoundStats[tp.id]), computed_at: new Date().toISOString() }))
          .filter(ts => ts.total_holes > 0)

        if (tripStatsRecords.length > 0) {
          await supabase.from('trip_stats').upsert(tripStatsRecords, { onConflict: 'trip_id,trip_player_id' })
        }

        // Compute awards
        const awardInputs = tripPlayers.map(tp => {
          const playerArr = tp.player as unknown as { id: string; name: string }[] | null
          return {
            trip_player_id: tp.id,
            player_name: playerArr?.[0]?.name ?? 'Unknown',
            trip_stats: computeTripStats(tripId, tp.id, allRoundStats[tp.id]),
            round_stats: allRoundStats[tp.id],
          }
        })
        const awards = computeAwards(tripId, awardInputs)
        if (awards.length > 0) {
          await supabase.from('trip_awards').delete().eq('trip_id', tripId)
          await supabase.from('trip_awards').insert(awards.map(a => ({ trip_id: tripId, ...a, computed_at: new Date().toISOString() })))
        }
      }
    } catch (err) {
      console.error('Stats recomputation after GHIN sync failed:', err)
    }
  }

  return NextResponse.json({
    total: results.length,
    updated: results.filter(r => r.status === 'updated').length,
    unchanged: results.filter(r => r.status === 'unchanged').length,
    failed: results.filter(r => r.status === 'lookup_failed' || r.status === 'error').length,
    results,
  })
}
