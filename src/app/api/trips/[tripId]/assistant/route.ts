import { streamText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import { buildAssistantTools } from '@/lib/assistant-tools'
import { NextRequest } from 'next/server'
import type { TripRole } from '@/lib/types'

function describePageContext(path: string | undefined, tripId: string): string {
  if (!path) return ''
  // Strip the /trip/[tripId] prefix to get the sub-route
  const sub = path.replace(`/trip/${tripId}`, '')
  if (!sub || sub === '' || sub === '/') return 'The user is on the trip home page.'
  if (sub === '/leaderboard') return 'The user is viewing the leaderboard.'
  if (sub === '/schedule') return 'The user is viewing the course schedule.'
  if (sub === '/teams') return 'The user is viewing teams.'
  if (sub === '/wallet') return 'The user is viewing the wallet/transactions.'
  if (sub === '/settings') return 'The user is in trip settings.'
  if (sub === '/head-to-head') return 'The user is viewing head-to-head matchups.'
  const liveMatch = sub.match(/^\/live\/(.+)$/)
  if (liveMatch) return `The user is on the live scoring page for course ID ${liveMatch[1]}.`
  const h2hMatch = sub.match(/^\/head-to-head\/(.+)/)
  if (h2hMatch) return `The user is viewing a head-to-head comparison for player ${h2hMatch[1]}.`
  return `The user is on page: ${sub}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Auth check — must be a trip member
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return new Response('Forbidden', { status: 403 })
  }

  // Fetch trip context for system prompt
  const { data: trip } = await supabase
    .from('trips')
    .select('name, year, location')
    .eq('id', tripId)
    .single()

  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('player:players(name)')
    .eq('trip_id', tripId)

  const playerNames = (tripPlayers ?? [])
    .map((tp: any) => tp.player?.name)
    .filter(Boolean)

  const { messages, pageContext } = await request.json()

  const userRole = membership.role as TripRole
  const pageDesc = describePageContext(pageContext, tripId)

  const roleInstructions = userRole === 'owner' || userRole === 'admin'
    ? `User role: ${userRole} (admin privileges).
You can create games, create matches, and add players to teams using your write tools.
IMPORTANT: When using write tools, ALWAYS call them first with confirmed: false to preview the action.
Describe the preview to the user and ask for confirmation. Only call with confirmed: true after the user says "yes" or confirms.`
    : `User role: player (read-only).
You cannot modify data. If the user asks you to create games, matches, or make changes, politely explain they need admin access.`

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: `You are ForeLive Assistant, the AI caddie for "${trip?.name ?? 'this golf trip'}".

Trip: ${trip?.name} (${trip?.year}) in ${trip?.location ?? 'TBD'}.
Players: ${playerNames.join(', ') || 'None yet'}.
${userRole ? `${roleInstructions}` : ''}
${pageDesc ? `\nPage context: ${pageDesc}` : ''}

Guidelines:
- Be concise and helpful. Use golf lingo and light humor when appropriate.
- Always use your tools to get current data — never make up scores or standings.
- Use markdown formatting: ## for headers, **bold** for names/emphasis, - for bullet lists.
- Format responses for easy mobile reading (short paragraphs, bullet points).
- You ONLY answer questions about this golf trip, ForeLive features, and golf in general. Politely decline anything else.
- Keep responses short — 2-3 sentences max unless the user asks for detail.`,
    messages,
    maxOutputTokens: 500,
    tools: buildAssistantTools(tripId, supabase, userRole),
    stopWhen: stepCountIs(7),
  })

  return result.toUIMessageStreamResponse()
}
