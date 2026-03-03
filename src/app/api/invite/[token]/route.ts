import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Service role client to read invites without RLS user context
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Look up invite by token (public — needed before auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const serviceClient = getServiceClient()

  const { data: invite, error } = await serviceClient
    .from('trip_invites')
    .select('id, trip_id, player_id, email, status, created_at, accepted_at')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // Get trip info
  const { data: trip } = await serviceClient
    .from('trips')
    .select('id, name, year, location')
    .eq('id', invite.trip_id)
    .single()

  return NextResponse.json({ invite, trip })
}

// POST: Accept invite (requires auth)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  // Require auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = getServiceClient()

  // Look up invite
  const { data: invite, error: inviteError } = await serviceClient
    .from('trip_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invite already accepted', redirect: '/admin' }, { status: 400 })
  }

  if (invite.status === 'expired') {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
  }

  // 1. Link the player record to this authenticated user
  const { error: playerError } = await serviceClient
    .from('players')
    .update({ user_id: user.id })
    .eq('id', invite.player_id)

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 })
  }

  // 2. Create trip_members record (role: player)
  await serviceClient
    .from('trip_members')
    .upsert(
      { trip_id: invite.trip_id, user_id: user.id, role: 'player' },
      { onConflict: 'trip_id,user_id' }
    )

  // 3. Update invite status to accepted
  await serviceClient
    .from('trip_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ success: true, redirect: '/admin/profile' })
}
