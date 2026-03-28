import { getUserProfileData } from '@/lib/v2/profile-data'
import { notFound } from 'next/navigation'
import FriendProfileClient from './friend-profile-client'

export default async function FriendProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const data = await getUserProfileData(userId)
  if (!data) notFound()

  return <FriendProfileClient data={data} userId={userId} />
}
