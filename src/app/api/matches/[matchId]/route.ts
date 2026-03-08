import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTripRole } from '@/lib/auth'
import { postSystemMessage } from '@/lib/notifications'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()

  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  // Fetch match players with trip_player details
  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select(
      'id, match_id, trip_player_id, side, trip_player:trip_players(id, player:players(id, name, handicap_index))'
    )
    .eq('match_id', matchId)

  return NextResponse.json({ ...match, match_players: matchPlayers || [] })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()

  // Look up trip_id via match → course to check role
  const { data: matchForRole } = await supabase
    .from('matches')
    .select('course_id, course:courses(trip_id)')
    .eq('id', matchId)
    .single()

  if (!matchForRole?.course) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseData = Array.isArray(matchForRole.course) ? matchForRole.course[0] : matchForRole.course as any
  const access = await requireTripRole(courseData.trip_id, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  // Build update object from provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (body.format !== undefined) updates.format = body.format
  if (body.point_value !== undefined) updates.point_value = body.point_value
  if (body.scorer_email !== undefined) updates.scorer_email = body.scorer_email
  if (body.status !== undefined) updates.status = body.status
  if (body.result !== undefined) updates.result = body.result
  if (body.winner_side !== undefined) updates.winner_side = body.winner_side

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  // Update match_players if provided
  if (body.team_a_player_ids !== undefined || body.team_b_player_ids !== undefined) {
    // Remove existing match_players
    const { error: deleteError } = await supabase
      .from('match_players')
      .delete()
      .eq('match_id', matchId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const newPlayers: { match_id: string; trip_player_id: string; side: string }[] = []

    if (body.team_a_player_ids) {
      for (const id of body.team_a_player_ids) {
        newPlayers.push({ match_id: matchId, trip_player_id: id, side: 'team_a' })
      }
    }

    if (body.team_b_player_ids) {
      for (const id of body.team_b_player_ids) {
        newPlayers.push({ match_id: matchId, trip_player_id: id, side: 'team_b' })
      }
    }

    if (newPlayers.length > 0) {
      const { error: insertError } = await supabase
        .from('match_players')
        .insert(newPlayers)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
  }

  // Fetch updated match with players
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select(
      'id, match_id, trip_player_id, side, trip_player:trip_players(id, player:players(id, name, handicap_index))'
    )
    .eq('match_id', matchId)

  // Post system chat message when match is manually marked complete
  if (body.status === 'completed') {
    const tripId = courseData.trip_id as string
    const allPlayers = matchPlayers || []
    function getName(mp: { trip_player?: unknown }): string {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tp = mp.trip_player as any
      const player = Array.isArray(tp?.player) ? tp.player[0] : tp?.player
      return player?.name || 'Unknown'
    }
    const teamANames = allPlayers.filter(mp => mp.side === 'team_a').map(getName).join(' & ')
    const teamBNames = allPlayers.filter(mp => mp.side === 'team_b').map(getName).join(' & ')
    const result = body.result || match?.result || ''
    const winnerSide = body.winner_side || match?.winner_side

    let message: string
    if (winnerSide === 'tie' || !winnerSide) {
      message = `🤝 Match finished — ${teamANames} vs ${teamBNames}${result ? ` (${result})` : ''}`
    } else {
      const winnerNames = winnerSide === 'team_a' ? teamANames : teamBNames
      const loserNames = winnerSide === 'team_a' ? teamBNames : teamANames
      message = `🏆 ${winnerNames} defeats ${loserNames}${result ? ` ${result}` : ''}!`
    }
    postSystemMessage(supabase, tripId, message, 'match_complete').catch(() => {})
  }

  return NextResponse.json({ ...match, match_players: matchPlayers || [] })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()

  // Look up trip_id via match → course to check role
  const { data: matchForRole } = await supabase
    .from('matches')
    .select('course_id, course:courses(trip_id)')
    .eq('id', matchId)
    .single()

  if (!matchForRole?.course) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseData = Array.isArray(matchForRole.course) ? matchForRole.course[0] : matchForRole.course as any
  const access = await requireTripRole(courseData.trip_id, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete match_players first
  await supabase.from('match_players').delete().eq('match_id', matchId)

  // Delete scores if any exist
  await supabase.from('scores').delete().eq('match_id', matchId)

  // Delete the match
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
