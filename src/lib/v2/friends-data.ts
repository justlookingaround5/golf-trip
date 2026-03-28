import { createClient } from '@/lib/supabase/server'
import type { PlayerV2 } from './types'

export async function getUserFriends(userId: string): Promise<PlayerV2[]> {
  const supabase = await createClient()

  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')

  if (!friendships || friendships.length === 0) return []

  const friendUserIds = friendships.map(f =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  )

  // Get profiles
  const { data: profiles } = await supabase
    .from('player_profiles')
    .select('user_id, display_name, avatar_url, handicap_index, location')
    .in('user_id', friendUserIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]))

  // Get players for fallback names
  const { data: players } = await supabase
    .from('players')
    .select('id, name, handicap_index, user_id')
    .in('user_id', friendUserIds)

  const playerMap = new Map((players ?? []).map(p => [p.user_id, p]))

  return friendUserIds.map(fid => {
    const profile = profileMap.get(fid)
    const player = playerMap.get(fid)
    return {
      id: fid,
      name: profile?.display_name ?? player?.name ?? 'Player',
      avatarUrl: profile?.avatar_url ?? null,
      handicap: profile?.handicap_index ?? player?.handicap_index ?? null,
      location: profile?.location ?? null,
    }
  })
}

export interface PendingRequest {
  friendshipId: string
  user: PlayerV2
}

export async function getPendingFriendRequests(): Promise<PendingRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: friendships } = await supabase
    .from('friendships')
    .select('id, requester_id')
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  if (!friendships || friendships.length === 0) return []

  const requesterIds = friendships.map(f => f.requester_id)

  const { data: profiles } = await supabase
    .from('player_profiles')
    .select('user_id, display_name, avatar_url, handicap_index, location')
    .in('user_id', requesterIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]))

  const { data: players } = await supabase
    .from('players')
    .select('id, name, handicap_index, user_id')
    .in('user_id', requesterIds)

  const playerMap = new Map((players ?? []).map(p => [p.user_id, p]))

  return friendships.map(f => {
    const profile = profileMap.get(f.requester_id)
    const player = playerMap.get(f.requester_id)
    return {
      friendshipId: f.id,
      user: {
        id: f.requester_id,
        name: profile?.display_name ?? player?.name ?? 'Player',
        avatarUrl: profile?.avatar_url ?? null,
        handicap: profile?.handicap_index ?? player?.handicap_index ?? null,
        location: profile?.location ?? null,
      },
    }
  })
}

export async function getMyFriends(): Promise<{ friends: PlayerV2[]; userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const friends = await getUserFriends(user.id)
  return { friends, userId: user.id }
}
