import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import HeadToHeadPicker from './picker-client'

export default async function HeadToHeadPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name, user_id)')
    .eq('trip_id', tripId)

  // Resolve display names from profiles
  const playerUserIds = (tripPlayers || [])
    .map((tp: { player: unknown }) => {
      const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
      return (player as { user_id?: string } | null)?.user_id
    })
    .filter(Boolean) as string[]

  let profileMap = new Map<string, string>()
  if (playerUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name')
      .in('user_id', playerUserIds)
    for (const p of profiles || []) {
      if (p.display_name) profileMap.set(p.user_id, p.display_name)
    }
  }

  const players = (tripPlayers || []).map((tp: { id: string; player: unknown }) => {
    const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
    const p = player as { id?: string; name?: string; user_id?: string } | null
    const displayName = p?.user_id ? profileMap.get(p.user_id) : undefined
    return {
      tripPlayerId: tp.id,
      name: (displayName || p?.name || 'Unknown').split(' ')[0],
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">
      <header className="bg-golf-800 px-4 py-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/trip/${tripId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white"
          >
            &larr; {trip.name}
          </Link>
          <h1 className="text-2xl font-bold">Head-to-Head</h1>
          <p className="text-golf-200 text-sm mt-1">Compare records between two players</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <HeadToHeadPicker tripId={tripId} players={players} />
      </div>
    </div>
  )
}
