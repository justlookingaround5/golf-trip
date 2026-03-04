import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, Course } from '@/lib/types'
import GamesClient from './games-client'

export default async function GamesPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (tripError || !trip) notFound()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, round_number, round_date, par')
    .eq('trip_id', tripId)
    .order('round_number')

  const courseIds = (courses ?? []).map((c) => c.id)

  const { data: roundGames } = courseIds.length > 0
    ? await supabase
        .from('round_games')
        .select(`
          id, course_id, buy_in, status,
          game_format:game_formats(id, name, icon, description, rules_summary, scoring_type, scope, team_based),
          round_game_players(id, side, trip_player:trip_players(id, player:players(name)))
        `)
        .in('course_id', courseIds)
        .neq('status', 'cancelled')
    : { data: [] }

  // Shape data for client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const games = (roundGames ?? []).map((g: any) => {
    const fmt = Array.isArray(g.game_format) ? g.game_format[0] : g.game_format
    const players = (g.round_game_players ?? []).map((rgp: any) => {
      const tp = Array.isArray(rgp.trip_player) ? rgp.trip_player[0] : rgp.trip_player
      const p = tp ? (Array.isArray(tp.player) ? tp.player[0] : tp.player) : null
      return { name: p?.name || 'Unknown', side: rgp.side as string | null }
    })
    return {
      id: g.id as string,
      course_id: g.course_id as string,
      buy_in: g.buy_in ?? 0,
      status: g.status as string,
      name: fmt?.name || 'Game',
      icon: fmt?.icon || '🎯',
      description: fmt?.description || null,
      rules_summary: fmt?.rules_summary || null,
      scoring_type: fmt?.scoring_type || null,
      scope: fmt?.scope || null,
      team_based: fmt?.team_based ?? false,
      players,
    }
  })

  const coursesData = (courses ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    round_number: c.round_number as number,
    round_date: (c as Course).round_date ?? null,
  }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-golf-800 px-4 py-6 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/trip/${tripId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition-colors"
          >
            &larr; {(trip as Trip).name}
          </Link>
          <h1 className="text-2xl font-bold">Games</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <GamesClient courses={coursesData} games={games} />
      </div>
    </div>
  )
}
