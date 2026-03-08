import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <SettingsClient
      email={user.email ?? ''}
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
    />
  )
}
