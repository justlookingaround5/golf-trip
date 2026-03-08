import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// /profile → redirect to /profile/[currentUserId]
export default async function ProfileRedirectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  redirect(`/profile/${user.id}`)
}
