import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Ensure profile exists
  let { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    const displayName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email?.split('@')[0]
      || 'User'
    const avatarUrl = user.user_metadata?.avatar_url
      || user.user_metadata?.picture
      || null

    await supabase.from('player_profiles').insert({
      user_id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
    })

    profile = { display_name: displayName, avatar_url: avatarUrl }
  }

  // Find today's active round for the Live Play nav link
  const today = new Date().toISOString().split('T')[0]
  const { data: tripMemberships } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', user.id)
  const tripIds = (tripMemberships || []).map(m => m.trip_id)

  let activeRound: { tripId: string; courseId: string; courseName: string } | null = null
  if (tripIds.length > 0) {
    const { data: todayCourses } = await supabase
      .from('courses')
      .select('id, trip_id, name')
      .in('trip_id', tripIds)
      .eq('round_date', today)
      .limit(1)
    if (todayCourses && todayCourses.length > 0) {
      activeRound = {
        tripId: todayCourses[0].trip_id,
        courseId: todayCourses[0].id,
        courseName: todayCourses[0].name,
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profile} activeRound={activeRound} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
