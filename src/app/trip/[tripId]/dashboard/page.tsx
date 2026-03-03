import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
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

  return (
    <DashboardClient
      trip={trip}
      courses={courses || []}
      todaysRound={todaysRound || null}
      todaysGames={todaysGames}
      recentFeed={recentFeed || []}
      topStandings={tripStats || []}
      awards={awards || []}
    />
  )
}
