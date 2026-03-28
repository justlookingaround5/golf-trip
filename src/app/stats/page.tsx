import { redirect } from 'next/navigation'
import { getMyStatsData } from '@/lib/v2/stats-data'
import StatsClient from './stats-client'

export default async function StatsPage() {
  const data = await getMyStatsData()
  if (!data) redirect('/admin/login')

  return <StatsClient data={data} isOwnProfile />
}
