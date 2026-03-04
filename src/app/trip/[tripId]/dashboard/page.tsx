import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { ReactionEmoji } from '@/lib/types'
import DashboardClient from './dashboard-client'

export default async function TripDashboardPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('trip_id', tripId)
    .order('round_number')

  // Find today's or next round
  const today = new Date().toISOString().split('T')[0]
  const todaysRound = courses?.find(c => c.round_date === today)
    || courses?.find(c => c.round_date && c.round_date >= today)
    || courses?.[0]

  // Active games on today's round
  let todaysGames: { id: string; buy_in: number; game_format?: { name: string; icon: string } }[] = []
  if (todaysRound) {
    const { data } = await supabase
      .from('round_games')
      .select('*, game_format:game_formats(name, icon)')
      .eq('course_id', todaysRound.id)
      .neq('status', 'cancelled')
    todaysGames = data || []
  }

  const { data: recentFeed } = await supabase
    .from('activity_feed')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch reactions and comment counts for feed items
  const feedIds = (recentFeed || []).map(f => f.id)
  let initialReactions: Record<string, { emoji: ReactionEmoji; count: number; user_ids: string[] }[]> = {}
  let initialCommentCounts: Record<string, number> = {}

  if (feedIds.length > 0) {
    const { data: reactions } = await supabase
      .from('activity_reactions')
      .select('activity_id, emoji, user_id')
      .in('activity_id', feedIds)

    // Group reactions by activity_id + emoji
    for (const r of reactions || []) {
      if (!initialReactions[r.activity_id]) initialReactions[r.activity_id] = []
      const emoji = r.emoji as ReactionEmoji
      const existing = initialReactions[r.activity_id].find(x => x.emoji === emoji)
      if (existing) {
        existing.count++
        existing.user_ids.push(r.user_id)
      } else {
        initialReactions[r.activity_id].push({ emoji, count: 1, user_ids: [r.user_id] })
      }
    }

    const { data: commentCounts } = await supabase
      .from('activity_comments')
      .select('activity_id')
      .in('activity_id', feedIds)

    for (const c of commentCounts || []) {
      initialCommentCounts[c.activity_id] = (initialCommentCounts[c.activity_id] || 0) + 1
    }
  }

  const { data: tripStats } = await supabase
    .from('trip_stats')
    .select('*, trip_player:trip_players(*, player:players(name))')
    .eq('trip_id', tripId)
    .order('total_gross', { ascending: true })
    .limit(5)

  const { data: awards } = await supabase
    .from('trip_awards')
    .select('*')
    .eq('trip_id', tripId)

  // Fetch trip players for RSVP card
  const { data: tripPlayersData } = await supabase
    .from('trip_players')
    .select('id, player:players(name)')
    .eq('trip_id', tripId)

  const tripPlayers = (tripPlayersData || []).map(tp => {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    return { id: tp.id, player: player ? { name: (player as { name: string }).name } : undefined }
  })

  // Find current user's trip_player_id
  let currentTripPlayerId: string | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: member } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (member) {
      // Find the trip_player linked to this user
      const { data: playerLink } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (playerLink) {
        const tp = (tripPlayersData || []).find(tp => {
          const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
          return (player as { id?: string } | null)?.id === playerLink.id
        })
        if (tp) currentTripPlayerId = tp.id
      }
    }
  }

  // Find next upcoming round (for RSVP)
  const nextRound = courses?.find(c => c.round_date && c.round_date >= today) || null

  return (
    <DashboardClient
      trip={trip}
      courses={courses || []}
      todaysRound={todaysRound || null}
      todaysGames={todaysGames}
      recentFeed={recentFeed || []}
      topStandings={tripStats || []}
      awards={awards || []}
      tripPlayers={tripPlayers}
      currentTripPlayerId={currentTripPlayerId}
      currentUserId={user?.id || null}
      nextRound={nextRound}
      initialReactions={initialReactions}
      initialCommentCounts={initialCommentCounts}
    />
  )
}
