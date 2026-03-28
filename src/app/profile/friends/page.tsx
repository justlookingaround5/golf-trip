import { redirect } from 'next/navigation'
import { getMyFriends } from '@/lib/v2/friends-data'
import FriendsClient from '@/app/profile/[userId]/friends/friends-client'

export default async function MyFriendsPage() {
  const data = await getMyFriends()
  if (!data) redirect('/admin/login')

  return <FriendsClient friends={data.friends} friendName="Profile" isOwnProfile />
}
