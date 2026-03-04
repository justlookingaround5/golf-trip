import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  // Verify the user is authenticated
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const name = (body.name || '').trim()
  const description = (body.description || '').trim() || null

  if (!name) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  // Use service role to bypass RLS
  const admin = getServiceClient()

  // Create the group
  const { data: group, error: groupError } = await admin
    .from('groups')
    .insert({ name, description, created_by: user.id })
    .select('id, name, description')
    .single()

  if (groupError || !group) {
    return NextResponse.json(
      { error: groupError?.message || 'Failed to create group' },
      { status: 500 }
    )
  }

  // Add the creator as owner
  const { error: memberError } = await admin
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    // Clean up the orphaned group
    await admin.from('groups').delete().eq('id', group.id)
    return NextResponse.json(
      { error: memberError.message || 'Failed to add you as group owner' },
      { status: 500 }
    )
  }

  return NextResponse.json(group)
}
