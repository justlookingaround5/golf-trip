import { NextRequest, NextResponse } from 'next/server'

/**
 * Stub GHIN lookup endpoint.
 * Phase 1: Returns 501 with a link to ghin.com for manual lookup.
 * Phase 2 (deferred): Will integrate with GHIN API when auth key is available.
 */
export async function GET(request: NextRequest) {
  const ghinNumber = request.nextUrl.searchParams.get('ghin_number')

  if (!ghinNumber) {
    return NextResponse.json({ error: 'ghin_number query parameter is required' }, { status: 400 })
  }

  return NextResponse.json(
    {
      error: 'GHIN API integration not yet available',
      message: 'Please look up your handicap index manually at ghin.com and enter it on your profile.',
      lookup_url: `https://www.ghin.com/golfer-search?ghinNumber=${encodeURIComponent(ghinNumber)}`,
    },
    { status: 501 }
  )
}
