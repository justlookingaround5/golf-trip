import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import { getActiveRound } from '@/lib/active-round'

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Ensure profile exists (fallback for edge cases where trigger didn't fire)
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

    // Also backfill trip_members for any trips this user created
    const { data: ownedTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('created_by', user.id)

    if (ownedTrips && ownedTrips.length > 0) {
      const memberRecords = ownedTrips.map((t: { id: string }) => ({
        trip_id: t.id,
        user_id: user.id,
        role: 'owner',
      }))
      await supabase.from('trip_members').upsert(memberRecords, {
        onConflict: 'trip_id,user_id',
      })
    }
  }

  // Find today's active round for the Live Scoring nav link
  const activeRound = await getActiveRound(supabase, user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profile} activeRound={activeRound} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
