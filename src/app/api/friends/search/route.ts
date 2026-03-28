import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/friends/search?q=name — search all player profiles by display_name
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const { data: profiles } = await supabase
    .from('player_profiles')
    .select('user_id, display_name, avatar_url, handicap_index, location')
    .ilike('display_name', `%${q}%`)
    .neq('user_id', user.id)
    .limit(10)

  if (!profiles || profiles.length === 0) return NextResponse.json({ results: [] })

  // Fetch existing friendships with these users
  const userIds = profiles.map((p) => p.user_id)
  const { data: fships } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      userIds
        .map((uid) =>
          `and(requester_id.eq.${user.id},addressee_id.eq.${uid}),and(requester_id.eq.${uid},addressee_id.eq.${user.id})`
        )
        .join(',')
    )

  const fshipMap = new Map<string, { id: string; status: string; isRequester: boolean }>()
  for (const f of fships || []) {
    const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
    fshipMap.set(otherId, { id: f.id, status: f.status, isRequester: f.requester_id === user.id })
  }

  return NextResponse.json({
    results: profiles.map((p) => ({
      userId: p.user_id,
      displayName: p.display_name || 'Unknown',
      avatarUrl: p.avatar_url,
      handicap: p.handicap_index ?? null,
      location: p.location ?? null,
      friendship: fshipMap.get(p.user_id) ?? null,
    })),
  })
}
