import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/ghin/sync?tripId=xxx
 *
 * Syncs handicap indexes for all players with GHIN numbers.
 * Uses the public GHIN directory endpoint for index lookup.
 */
export async function POST(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get('tripId')
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get all player profiles with GHIN numbers
  const { data: profiles, error } = await supabase
    .from('player_profiles')
    .select('user_id, ghin_number, handicap_index, display_name')
    .not('ghin_number', 'is', null)

  if (error || !profiles) {
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  const results: { name: string; old_index: number | null; new_index: number | null; status: string }[] = []

  for (const profile of profiles) {
    if (!profile.ghin_number) continue

    try {
      const res = await fetch(
        `https://api.ghin.com/api/v1/golfers.json?golfer_id=${encodeURIComponent(profile.ghin_number)}&from_golfer=false`,
        { headers: { 'Content-Type': 'application/json' } }
      )

      if (!res.ok) {
        results.push({
          name: profile.display_name || profile.ghin_number,
          old_index: profile.handicap_index,
          new_index: null,
          status: 'lookup_failed',
        })
        continue
      }

      const data = await res.json()
      const golfer = data?.golfers?.[0]
      const newIndex = golfer?.handicap_index != null ? parseFloat(golfer.handicap_index) : null

      if (newIndex != null && newIndex !== profile.handicap_index) {
        await supabase
          .from('player_profiles')
          .update({ handicap_index: newIndex })
          .eq('user_id', profile.user_id)

        await supabase
          .from('players')
          .update({ handicap_index: newIndex })
          .eq('user_id', profile.user_id)

        results.push({
          name: profile.display_name || profile.ghin_number,
          old_index: profile.handicap_index,
          new_index: newIndex,
          status: 'updated',
        })
      } else {
        results.push({
          name: profile.display_name || profile.ghin_number,
          old_index: profile.handicap_index,
          new_index: newIndex,
          status: 'unchanged',
        })
      }
    } catch {
      results.push({
        name: profile.display_name || profile.ghin_number,
        old_index: profile.handicap_index,
        new_index: null,
        status: 'error',
      })
    }
  }

  // If tripId provided, trigger stats recomputation for updated players
  if (tripId && results.some(r => r.status === 'updated')) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    await fetch(`${baseUrl}/api/trips/${tripId}/stats/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})
  }

  return NextResponse.json({
    total: results.length,
    updated: results.filter(r => r.status === 'updated').length,
    unchanged: results.filter(r => r.status === 'unchanged').length,
    failed: results.filter(r => r.status === 'lookup_failed' || r.status === 'error').length,
    results,
  })
}
