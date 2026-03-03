import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lookupGhin } from '@/lib/ghin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { ghin_number, email, password } = body

  if (!ghin_number || !email || !password) {
    return NextResponse.json(
      { error: 'ghin_number, email, and password are required' },
      { status: 400 }
    )
  }

  const result = await lookupGhin(ghin_number, email, password)

  if (!result) {
    return NextResponse.json(
      { error: 'GHIN lookup failed. Check your credentials and GHIN number.' },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
