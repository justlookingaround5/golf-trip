import { getUserFriends } from '@/lib/v2/friends-data'
import FriendsClient from './friends-client'

export default async function FriendFriendsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const friends = await getUserFriends(userId)

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  // Check if viewing own profile
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === userId

  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()

  const friendName = profile?.display_name ?? 'Player'

  return <FriendsClient friends={friends} friendName={friendName} isOwnProfile={isOwnProfile} />
}
