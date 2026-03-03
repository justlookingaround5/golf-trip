import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lookupGhin } from '@/lib/ghin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ghinNumber = searchParams.get('ghin_number')

  if (!ghinNumber) {
    return NextResponse.json(
      { error: 'ghin_number query parameter is required' },
      { status: 400 }
    )
  }

  const result = await lookupGhin(ghinNumber)

  if (!result) {
    return NextResponse.json(
      { error: 'GHIN lookup failed. Credentials may not be configured or the number is invalid.' },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
