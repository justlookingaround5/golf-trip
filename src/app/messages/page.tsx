import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MessagesClient from './messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch user's trips for Trips tab
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('trip:trips(id, name, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips = (memberships || [])
    .map((m: any) => {
      const t = Array.isArray(m.trip) ? m.trip[0] : m.trip
      return t
    })
    .filter(Boolean)

  // Fetch accepted friends for Friends tab
  const { data: fships } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendUserIds = (fships || []).map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  let friends: { userId: string; displayName: string; avatarUrl: string | null }[] = []
  if (friendUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', friendUserIds)
    friends = (profiles || []).map((p) => ({
      userId: p.user_id,
      displayName: p.display_name || 'Unknown',
      avatarUrl: p.avatar_url,
    }))
  }

  return (
    <MessagesClient
      trips={trips}
      friends={friends}
    />
  )
}
