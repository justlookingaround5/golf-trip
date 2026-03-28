import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMessageThreads } from '@/lib/v2/messages-data'
import MessagesClient from './messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const threads = await getMessageThreads(user.id)

  return <MessagesClient threads={threads} />
}
