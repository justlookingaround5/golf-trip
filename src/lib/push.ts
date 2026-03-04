import { createClient } from '@supabase/supabase-js'

export async function sendPushToTrip({
  tripId,
  title,
  body,
  url,
  excludeUserId,
}: {
  tripId: string
  title: string
  body: string
  url?: string
  excludeUserId?: string
}) {
  if (!process.env.VAPID_PRIVATE_KEY) return

  // Dynamic import to avoid top-level Node crypto issues during Vercel page collection
  const webpush = (await import('web-push')).default

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@forelive.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY
  )

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get trip member user_ids
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)

  if (!members || members.length === 0) return

  const userIds = members
    .map(m => m.user_id)
    .filter(id => id !== excludeUserId)

  if (userIds.length === 0) return

  // Get push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .in('user_id', userIds)

  if (!subscriptions || subscriptions.length === 0) return

  const payload = JSON.stringify({ title, body, url })

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload
      )
    )
  )

  // Clean up expired subscriptions (410 Gone)
  const expiredIds: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected' && (result.reason as { statusCode?: number })?.statusCode === 410) {
      expiredIds.push(subscriptions[i].id)
    }
  })

  if (expiredIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expiredIds)
  }
}
