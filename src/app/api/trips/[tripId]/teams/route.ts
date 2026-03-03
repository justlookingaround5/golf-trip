import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTripRole } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Get all teams for this trip
  const { data: teams, error } = await supabase
    .from('teams')
    .select('*')
    .eq('trip_id', tripId)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get team_players with trip_player and player details for all teams
  const teamIds = teams.map((t: { id: string }) => t.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let teamPlayers: any[] = []
  if (teamIds.length > 0) {
    const { data: tp, error: tpError } = await supabase
      .from('team_players')
      .select('team_id, trip_player_id, trip_player:trip_players(id, paid, player:players(id, name, handicap_index))')
      .in('team_id', teamIds)

    if (tpError) {
      return NextResponse.json({ error: tpError.message }, { status: 500 })
    }

    teamPlayers = tp || []
  }

  // Attach players to each team
  const result = teams.map((team: { id: string }) => ({
    ...team,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    team_players: teamPlayers.filter((tp: any) => tp.team_id === team.id),
  }))

  return NextResponse.json(result)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const body = await request.json()

  if (!body.name) {
    return NextResponse.json(
      { error: 'Team name is required' },
      { status: 400 }
    )
  }

  // Create the team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      trip_id: tripId,
      name: body.name,
    })
    .select()
    .single()

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 })
  }

  // Add players to the team if provided
  const playerIds: string[] = body.player_ids || []
  if (playerIds.length > 0) {
    const teamPlayerRecords = playerIds.map((tripPlayerId: string) => ({
      team_id: team.id,
      trip_player_id: tripPlayerId,
    }))

    const { error: insertError } = await supabase
      .from('team_players')
      .insert(teamPlayerRecords)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  // Fetch the team with its players for the response
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('team_id, trip_player_id, trip_player:trip_players(id, paid, player:players(id, name, handicap_index))')
    .eq('team_id', team.id)

  return NextResponse.json(
    { ...team, team_players: teamPlayers || [] },
    { status: 201 }
  )
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const body = await request.json()

  if (!body.team_id) {
    return NextResponse.json(
      { error: 'team_id is required' },
      { status: 400 }
    )
  }

  // Update team name if provided
  if (body.name) {
    const { error: updateError } = await supabase
      .from('teams')
      .update({ name: body.name })
      .eq('id', body.team_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  // Update player assignments if provided
  if (body.player_ids !== undefined) {
    // Remove all existing team_player records for this team
    const { error: deleteError } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', body.team_id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new team_player records
    const playerIds: string[] = body.player_ids || []
    if (playerIds.length > 0) {
      const teamPlayerRecords = playerIds.map((tripPlayerId: string) => ({
        team_id: body.team_id,
        trip_player_id: tripPlayerId,
      }))

      const { error: insertError } = await supabase
        .from('team_players')
        .insert(teamPlayerRecords)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
  }

  // Fetch updated team with players
  const { data: team, error: fetchError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', body.team_id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('team_id, trip_player_id, trip_player:trip_players(id, paid, player:players(id, name, handicap_index))')
    .eq('team_id', body.team_id)

  return NextResponse.json({ ...team, team_players: teamPlayers || [] })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')

  if (!teamId) {
    return NextResponse.json(
      { error: 'team_id query parameter is required' },
      { status: 400 }
    )
  }

  // Delete team_player records first (FK constraint)
  await supabase
    .from('team_players')
    .delete()
    .eq('team_id', teamId)

  // Delete the team
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
