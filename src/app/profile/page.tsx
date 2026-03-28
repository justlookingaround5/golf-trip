import { redirect } from 'next/navigation'
import { getMyProfileData } from '@/lib/v2/profile-data'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const data = await getMyProfileData()
  if (!data) redirect('/admin/login')

  return <ProfileClient data={data} />
}
