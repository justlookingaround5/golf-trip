import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/friends?userId=<userId> — accepted friends of any user (public)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data: fships } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')

  const friendUserIds = (fships || []).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  )

  if (friendUserIds.length === 0) return NextResponse.json({ friends: [] })

  const { data: profiles } = await supabase
    .from('player_profiles')
    .select('user_id, display_name, avatar_url, handicap_index')
    .in('user_id', friendUserIds)

  return NextResponse.json({
    friends: (profiles || []).map((p) => ({
      userId: p.user_id,
      displayName: p.display_name || 'Unknown',
      avatarUrl: p.avatar_url,
      handicap: p.handicap_index ?? null,
    })),
  })
}

// POST /api/friends — send a friend request
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { addresseeUserId } = body
  if (!addresseeUserId || addresseeUserId === user.id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Check for existing friendship (either direction)
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeUserId}),and(requester_id.eq.${addresseeUserId},addressee_id.eq.${user.id})`
    )
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Friendship already exists', existing }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeUserId })
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
