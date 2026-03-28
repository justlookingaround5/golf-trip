import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/friends/pending — pending friend requests (both sent and received)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: friendships } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'pending')

  if (!friendships || friendships.length === 0) {
    return NextResponse.json({ incoming: [], outgoing: [] })
  }

  const incoming = friendships.filter(f => f.addressee_id === user.id)
  const outgoing = friendships.filter(f => f.requester_id === user.id)

  const otherUserIds = [
    ...incoming.map(f => f.requester_id),
    ...outgoing.map(f => f.addressee_id),
  ]

  if (otherUserIds.length === 0) {
    return NextResponse.json({ incoming: [], outgoing: [] })
  }

  const [{ data: profiles }, { data: players }] = await Promise.all([
    supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url, handicap_index, location')
      .in('user_id', otherUserIds),
    supabase
      .from('players')
      .select('user_id, name, handicap_index')
      .in('user_id', otherUserIds),
  ])

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]))
  const playerMap = new Map((players ?? []).map(p => [p.user_id, p]))

  function buildRow(friendshipId: string, otherUserId: string) {
    const profile = profileMap.get(otherUserId)
    const player = playerMap.get(otherUserId)
    return {
      friendshipId,
      userId: otherUserId,
      displayName: profile?.display_name ?? player?.name ?? 'Player',
      avatarUrl: profile?.avatar_url ?? null,
      handicap: profile?.handicap_index ?? player?.handicap_index ?? null,
      location: profile?.location ?? null,
    }
  }

  return NextResponse.json({
    incoming: incoming.map(f => buildRow(f.id, f.requester_id)),
    outgoing: outgoing.map(f => buildRow(f.id, f.addressee_id)),
  })
}
