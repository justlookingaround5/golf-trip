import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/games/formats
 *
 * Returns all active game formats, optionally filtered by tier or scope.
 * Query params: ?tier=1&scope=foursome
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier')
  const scope = searchParams.get('scope')

  const supabase = await createClient()

  let query = supabase
    .from('game_formats')
    .select('*')
    .eq('active', true)
    .order('tier', { ascending: true })
    .order('name', { ascending: true })

  if (tier) query = query.eq('tier', parseInt(tier))
  if (scope) query = query.eq('scope', scope)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
