import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch course with trip info
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, trip_id, name, slope, rating, par, round_number, round_date, golf_course_api_id')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Check if this is a quick round
  const { data: trip } = await supabase
    .from('trips')
    .select('is_quick_round')
    .eq('id', course.trip_id)
    .single()

  // Fetch holes with yardage
  const { data: holes } = await supabase
    .from('holes')
    .select('id, course_id, hole_number, par, handicap_index, yardage')
    .eq('course_id', courseId)
    .order('hole_number')

  // Fetch trip players with player details
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, trip_id, player_id, paid, player:players(id, name, handicap_index, user_id)')
    .eq('trip_id', course.trip_id)

  // Fetch round_scores for this course
  const { data: roundScores } = await supabase
    .from('round_scores')
    .select('*')
    .eq('course_id', courseId)

  // Fetch course handicaps
  const { data: courseHandicaps } = await supabase
    .from('player_course_handicaps')
    .select('id, trip_player_id, course_id, handicap_strokes')
    .eq('course_id', courseId)

  // Fetch active games for this course
  const { data: roundGames } = await supabase
    .from('round_games')
    .select(`
      id, course_id, trip_id, game_format_id, config, buy_in, status,
      game_format:game_formats(id, name, icon, engine_key, scoring_type),
      round_game_players(id, round_game_id, trip_player_id, side, metadata)
    `)
    .eq('course_id', courseId)
    .neq('status', 'cancelled')

  // Fetch game results
  const roundGameIds = (roundGames || []).map(rg => rg.id)
  const { data: gameResults } = roundGameIds.length > 0
    ? await supabase
        .from('game_results')
        .select('*')
        .in('round_game_id', roundGameIds)
    : { data: [] }

  // Fetch recent activity feed for this course
  const { data: activityFeed } = await supabase
    .from('activity_feed')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
    .limit(30)

  // Fetch round stats for this course
  const { data: roundStats } = await supabase
    .from('round_stats')
    .select('*')
    .eq('course_id', courseId)

  // Find current user's trip_player_id
  const currentTripPlayer = (tripPlayers || []).find(tp => {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    return player?.user_id === user.id
  })

  // Find the current user's match on this course
  let matchInfo: { id: string; format: string; pointValue: number; playerTpIds: string[]; teamA: string[]; teamB: string[] } | null = null
  if (currentTripPlayer) {
    const { data: matchRows } = await supabase
      .from('matches')
      .select('id, format, point_value, match_players(trip_player_id, side)')
      .eq('course_id', courseId)

    if (matchRows) {
      const userMatch = matchRows.find(m =>
        (m.match_players ?? []).some(
          (mp: { trip_player_id: string }) => mp.trip_player_id === currentTripPlayer.id
        )
      )
      if (userMatch) {
        const players = (userMatch.match_players ?? []) as { trip_player_id: string; side: string }[]
        matchInfo = {
          id: userMatch.id,
          format: userMatch.format,
          pointValue: userMatch.point_value ?? 1,
          playerTpIds: players.map(mp => mp.trip_player_id),
          teamA: players.filter(mp => mp.side === 'team_a').map(mp => mp.trip_player_id),
          teamB: players.filter(mp => mp.side === 'team_b').map(mp => mp.trip_player_id),
        }
      }
    }
  }

  // Fetch player round tees
  const tripPlayerIds = (tripPlayers || []).map(tp => tp.id)
  const { data: playerTees } = tripPlayerIds.length > 0
    ? await supabase
        .from('player_round_tees')
        .select('*')
        .eq('course_id', courseId)
        .in('trip_player_id', tripPlayerIds)
    : { data: [] }

  return NextResponse.json({
    course,
    holes: holes || [],
    tripPlayers: tripPlayers || [],
    roundScores: roundScores || [],
    courseHandicaps: courseHandicaps || [],
    roundGames: roundGames || [],
    gameResults: gameResults || [],
    activityFeed: activityFeed || [],
    currentTripPlayerId: currentTripPlayer?.id || null,
    playerTees: playerTees || [],
    roundStats: roundStats || [],
    matchInfo: matchInfo,
    isQuickRound: trip?.is_quick_round || false,
    ...((tripPlayers || []).length > 4 ? { warning: 'More than 4 players detected. Maximum 4 players per scorecard.' } : {}),
  })
}
