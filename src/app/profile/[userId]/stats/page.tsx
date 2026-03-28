import { getUserStatsData } from '@/lib/v2/stats-data'
import StatsClient from '@/app/stats/stats-client'

export default async function FriendStatsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const data = await getUserStatsData(userId)

  return <StatsClient data={data} />
}
