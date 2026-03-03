import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import JoinClient from './join-client'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const serviceClient = getServiceClient()

  // Look up invite
  const { data: invite } = await serviceClient
    .from('trip_invites')
    .select('id, trip_id, player_id, email, status, accepted_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Invite Not Found</h1>
          <p className="text-gray-600">This invite link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  // Get trip info
  const { data: trip } = await serviceClient
    .from('trips')
    .select('id, name, year, location')
    .eq('id', invite.trip_id)
    .single()

  // Check current auth state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <JoinClient
      token={token}
      invite={{
        status: invite.status,
      }}
      trip={trip ? { name: trip.name, year: trip.year, location: trip.location } : null}
      isLoggedIn={!!user}
    />
  )
}
