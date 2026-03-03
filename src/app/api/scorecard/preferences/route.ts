import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/scorecard/preferences
 *
 * Returns the authenticated user's scorecard display preferences.
 */
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: prefs, error: prefsError } = await supabase
    .from('scorecard_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (prefsError) {
    return NextResponse.json({ error: prefsError.message }, { status: 500 })
  }

  // Return defaults if no record exists
  if (!prefs) {
    return NextResponse.json({
      preferences: {
        user_id: user.id,
        visible_columns: ['gross', 'net', 'vs_par'],
        view_mode: 'standard',
      },
    })
  }

  return NextResponse.json({ preferences: prefs })
}

/**
 * PUT /api/scorecard/preferences
 *
 * Create or update scorecard display preferences.
 * Body: {
 *   visible_columns?: ScorecardColumnKey[],
 *   view_mode?: 'compact' | 'standard' | 'expanded'
 * }
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()

  const validColumns = [
    'gross', 'net', 'vs_par', 'skins_status', 'nassau_status',
    'stableford_points', 'game_points', 'running_total', 'handicap_strokes',
  ]
  const validModes = ['compact', 'standard', 'expanded']

  const visibleColumns = Array.isArray(body.visible_columns)
    ? body.visible_columns.filter((c: string) => validColumns.includes(c))
    : undefined

  const viewMode = validModes.includes(body.view_mode) ? body.view_mode : undefined

  const record: Record<string, unknown> = {
    user_id: user.id,
  }
  if (visibleColumns !== undefined) record.visible_columns = visibleColumns
  if (viewMode !== undefined) record.view_mode = viewMode

  const { data, error } = await supabase
    .from('scorecard_preferences')
    .upsert(record, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preferences: data })
}
