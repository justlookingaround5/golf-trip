import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .order('year', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(trips)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.name || !body.year) {
    return NextResponse.json(
      { error: 'Name and year are required' },
      { status: 400 }
    )
  }

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      name: body.name,
      year: body.year,
      location: body.location || null,
      match_buy_in: body.match_buy_in ?? 100,
      skins_buy_in: body.skins_buy_in ?? 10,
      skins_mode: body.skins_mode || 'net',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(trip, { status: 201 })
}
