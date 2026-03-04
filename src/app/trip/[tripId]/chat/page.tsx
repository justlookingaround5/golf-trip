import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ChatClient from './chat-client'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()

  // Fetch initial 50 messages (newest first, then reverse in client)
  const { data: messages } = await supabase
    .from('trip_messages')
    .select('id, user_id, content, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Batch fetch profiles for message authors
  const authorIds = [...new Set((messages || []).map(m => m.user_id))]
  let profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {}
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', authorIds)

    for (const p of profiles || []) {
      profileMap[p.user_id] = {
        display_name: p.display_name || 'Unknown',
        avatar_url: p.avatar_url,
      }
    }
  }

  // Add own profile if not in map
  if (!profileMap[user.id]) {
    const { data: ownProfile } = await supabase
      .from('player_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single()

    profileMap[user.id] = {
      display_name: ownProfile?.display_name || 'You',
      avatar_url: ownProfile?.avatar_url || null,
    }
  }

  const initialMessages = (messages || []).reverse().map(m => ({
    ...m,
    display_name: profileMap[m.user_id]?.display_name || 'Unknown',
    avatar_url: profileMap[m.user_id]?.avatar_url || null,
  }))

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-golf-800 px-4 py-4 text-white shrink-0">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link
            href={`/trip/${tripId}`}
            className="text-golf-300 hover:text-white text-sm"
          >
            &larr;
          </Link>
          <div>
            <h1 className="text-lg font-bold">Trash Talk</h1>
            <p className="text-golf-200 text-xs">{trip.name}</p>
          </div>
        </div>
      </header>

      <ChatClient
        tripId={tripId}
        currentUserId={user.id}
        initialMessages={initialMessages}
        currentUserProfile={profileMap[user.id]}
      />
    </div>
  )
}
