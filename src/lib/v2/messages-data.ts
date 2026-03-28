import { createClient } from '@/lib/supabase/server'
import type { MessageThread, ChatMessageV2 } from './types'

export async function getMessageThreads(userId: string): Promise<MessageThread[]> {
  const supabase = await createClient()

  // ── Trip threads ──
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', userId)

  const tripIds = (memberships ?? []).map(m => m.trip_id)

  let tripThreads: MessageThread[] = []
  if (tripIds.length > 0) {
    const [{ data: trips }, { data: tripMessages }] = await Promise.all([
      supabase.from('trips').select('id, name').in('id', tripIds),
      supabase.from('trip_messages').select('trip_id, content, created_at').in('trip_id', tripIds).order('created_at', { ascending: false }),
    ])

    const latestByTrip = new Map<string, { content: string; created_at: string }>()
    for (const m of tripMessages ?? []) {
      if (!latestByTrip.has(m.trip_id)) {
        latestByTrip.set(m.trip_id, { content: m.content, created_at: m.created_at })
      }
    }

    tripThreads = (trips ?? []).map(t => {
      const latest = latestByTrip.get(t.id)
      return {
        id: `trip-${t.id}`,
        type: 'trip' as const,
        name: t.name,
        avatarUrl: null,
        lastMessage: latest?.content ?? null,
        lastMessageAt: latest?.created_at ?? null,
        unreadCount: 0,
        tripId: t.id,
      }
    })
  }

  // ── DM threads ──
  const { data: dmMessages } = await supabase
    .from('direct_messages')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  // Group by conversation partner, keep latest message
  const latestByPartner = new Map<string, { content: string; created_at: string }>()
  for (const m of dmMessages ?? []) {
    const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id
    if (!latestByPartner.has(partnerId)) {
      latestByPartner.set(partnerId, { content: m.content, created_at: m.created_at })
    }
  }

  let dmThreads: MessageThread[] = []
  if (latestByPartner.size > 0) {
    const partnerIds = [...latestByPartner.keys()]
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name')
      .in('user_id', partnerIds)

    const nameMap = new Map<string, string>()
    for (const p of profiles ?? []) {
      nameMap.set(p.user_id, p.display_name || 'Unknown')
    }

    dmThreads = partnerIds.map(partnerId => {
      const latest = latestByPartner.get(partnerId)!
      const sortedIds = [userId, partnerId].sort().join('-')
      return {
        id: `dm-${sortedIds}`,
        type: 'dm' as const,
        name: nameMap.get(partnerId) || 'Unknown',
        avatarUrl: null,
        lastMessage: latest.content,
        lastMessageAt: latest.created_at,
        unreadCount: 0,
        friendUserId: partnerId,
      }
    })
  }

  // Merge and sort
  const threads = [...tripThreads, ...dmThreads]
  threads.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))

  return threads
}

export interface TripChatData {
  tripId: string
  tripName: string
  tripCoverImageUrl: string | null
  currentUserId: string
  currentUserProfile: { display_name: string; avatar_url: string | null }
  initialMessages: {
    id: string
    user_id: string | null
    content: string
    created_at: string
    is_system: boolean
    system_type: string | null
    display_name: string
    avatar_url: string | null
  }[]
}

export async function getTripChatMessages(tripId: string): Promise<TripChatData | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, cover_image_url')
    .eq('id', tripId)
    .maybeSingle()

  if (!trip) return null

  // Fetch initial 50 messages
  const { data: messages } = await supabase
    .from('trip_messages')
    .select('id, user_id, content, created_at, is_system, system_type')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Batch fetch profiles
  const authorIds = [...new Set((messages ?? []).map(m => m.user_id).filter(Boolean))] as string[]
  const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {}

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', authorIds)

    for (const p of profiles ?? []) {
      profileMap[p.user_id] = { display_name: p.display_name || 'Unknown', avatar_url: p.avatar_url }
    }
  }

  // Add own profile if missing
  if (!profileMap[user.id]) {
    const { data: ownProfile } = await supabase
      .from('player_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

    profileMap[user.id] = {
      display_name: ownProfile?.display_name || 'You',
      avatar_url: ownProfile?.avatar_url || null,
    }
  }

  const initialMessages = (messages ?? []).reverse().map(m => ({
    ...m,
    is_system: m.is_system ?? false,
    system_type: m.system_type ?? null,
    display_name: m.is_system || !m.user_id
      ? 'ForeLive'
      : profileMap[m.user_id]?.display_name || 'Unknown',
    avatar_url: m.is_system || !m.user_id
      ? null
      : profileMap[m.user_id]?.avatar_url || null,
  }))

  return {
    tripId,
    tripName: trip.name,
    tripCoverImageUrl: trip.cover_image_url ?? null,
    currentUserId: user.id,
    currentUserProfile: profileMap[user.id],
    initialMessages,
  }
}

export interface DmChatData {
  friendUserId: string
  friendName: string
  friendAvatarUrl: string | null
  currentUserId: string
  currentUserProfile: { display_name: string; avatar_url: string | null }
  initialMessages: {
    id: string
    user_id: string
    content: string
    created_at: string
    display_name: string
    avatar_url: string | null
  }[]
}

export async function getDmChatMessages(userId1: string, userId2: string): Promise<DmChatData | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Determine which ID is the friend
  const friendUserId = user.id === userId1 ? userId2 : userId1

  // Fetch friend's profile
  const { data: friendProfile } = await supabase
    .from('player_profiles')
    .select('display_name, avatar_url')
    .eq('user_id', friendUserId)
    .maybeSingle()

  const friendName = friendProfile?.display_name || 'Unknown'

  // Fetch initial 50 messages between the two users
  const { data: messages } = await supabase
    .from('direct_messages')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: false })
    .limit(50)

  // Get own profile
  const { data: ownProfile } = await supabase
    .from('player_profiles')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentUserProfile = {
    display_name: ownProfile?.display_name || 'You',
    avatar_url: ownProfile?.avatar_url || null,
  }

  const initialMessages = (messages ?? []).reverse().map(m => ({
    id: m.id,
    user_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    display_name: m.sender_id === user.id
      ? currentUserProfile.display_name
      : friendName,
    avatar_url: m.sender_id === user.id
      ? currentUserProfile.avatar_url
      : friendProfile?.avatar_url || null,
  }))

  return {
    friendUserId,
    friendName,
    friendAvatarUrl: friendProfile?.avatar_url || null,
    currentUserId: user.id,
    currentUserProfile,
    initialMessages,
  }
}
