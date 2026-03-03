import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTripRole } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(trip)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const body = await request.json()

  const { data: trip, error } = await supabase
    .from('trips')
    .update({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.year !== undefined && { year: body.year }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.match_buy_in !== undefined && { match_buy_in: body.match_buy_in }),
      ...(body.skins_buy_in !== undefined && { skins_buy_in: body.skins_buy_in }),
      ...(body.skins_mode !== undefined && { skins_mode: body.skins_mode }),
      ...(body.status !== undefined && { status: body.status }),
    })
    .eq('id', tripId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(trip)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params

  const access = await requireTripRole(tripId, ['owner', 'admin'])
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
