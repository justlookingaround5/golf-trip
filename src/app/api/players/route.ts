import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(players)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const body = await request.json()

  if (!body.name) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    )
  }

  const { data: player, error } = await supabase
    .from('players')
    .insert({
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      handicap_index: body.handicap_index ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(player, { status: 201 })
}
