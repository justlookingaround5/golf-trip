import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuickRoundClient from './quick-round-client'

export default async function QuickRoundPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Get user's display name and handicap to pre-fill the first player slot
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name, handicap_index')
    .eq('user_id', user.id)
    .single()

  // Fetch available game formats
  const { data: gameFormats } = await supabase
    .from('game_formats')
    .select('id, name, description, icon, min_players, max_players, team_based')
    .eq('name', 'Best Ball')
    .order('name')

  return (
    <QuickRoundClient
      userName={profile?.display_name || ''}
      userHandicap={profile?.handicap_index ?? null}
      gameFormats={gameFormats || []}
    />
  )
}
