import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { requireTripRole } from '@/lib/auth'
import GameSetupClient from './game-setup-client'

export default async function RoundGamesPage({
  params,
}: {
  params: Promise<{ tripId: string; courseId: string }>
}) {
  const { tripId, courseId } = await params

  const auth = await requireTripRole(tripId, ['owner', 'admin'])
  if (!auth) notFound()

  const supabase = await createClient()

  // Fetch course info and trip skins defaults in parallel
  const [{ data: course }, { data: trip }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).single(),
    supabase.from('trips').select('skins_mode, skins_buy_in').eq('id', tripId).single(),
  ])

  if (!course) notFound()

  // Fetch available game formats
  const { data: formats } = await supabase
    .from('game_formats')
    .select('*')
    .eq('active', true)
    .order('tier')
    .order('name')

  // Fetch trip players
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('*, player:players(*)')
    .eq('trip_id', tripId)

  // Fetch existing round games
  const { data: existingGames } = await supabase
    .from('round_games')
    .select(`
      *,
      game_format:game_formats(*),
      round_game_players(*, trip_player:trip_players(*, player:players(*)))
    `)
    .eq('course_id', courseId)
    .eq('trip_id', tripId)
    .order('created_at')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Games — {course.name}
        </h2>
        <p className="text-sm text-gray-500">
          Round {course.round_number} · Par {course.par}
        </p>
      </div>

      <GameSetupClient
        tripId={tripId}
        courseId={courseId}
        formats={formats || []}
        tripPlayers={tripPlayers || []}
        existingGames={existingGames || []}
        defaultSkinsMode={(trip?.skins_mode === 'gross' ? 'gross' : 'net')}
        defaultSkinsBuyIn={trip?.skins_buy_in ?? 0}
      />
    </div>
  )
}
