import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: invites, error } = await supabase
    .from('trip_invites')
    .select('id, trip_id, player_id, email, token, status, invited_by, created_at, accepted_at')
    .eq('trip_id', tripId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(invites || [])
}
