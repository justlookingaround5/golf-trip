import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-golf-800 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-lg font-bold hover:text-gold">
            ForeLive Admin
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/profile"
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-golf-700"
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-golf-600 text-xs font-bold">
                  {(profile.display_name || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium hidden sm:inline">
                {profile.display_name}
              </span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
