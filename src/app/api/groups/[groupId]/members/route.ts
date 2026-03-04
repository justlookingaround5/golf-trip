// src/app/api/groups/[groupId]/members/route.ts
//
// Handles adding/removing members from a group.
// Replaces the direct Supabase client call in the groups/[groupId] page
// so we can send email notifications server-side via Resend.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendGroupInviteEmail } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/groups/[groupId]/members
// Body: { user_id: string }
// Adds a user to the group and sends them an invite email.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { user_id } = body

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const admin = getServiceClient()

  // Verify the requester is an owner or admin of this group
  const { data: myMembership } = await admin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get group info for the email
  const { data: group } = await admin
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Get the inviter's display name
  const { data: inviterProfile } = await admin
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  // Get the invitee's profile (display name + email)
  const { data: inviteeProfile } = await admin
    .from('player_profiles')
    .select('display_name, email')
    .eq('user_id', user_id)
    .single()

  // Add them to the group
  const { data: member, error: insertError } = await admin
    .from('group_members')
    .insert({ group_id: groupId, user_id, role: 'member' })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Send invite email (best effort — don't fail if email fails)
  if (inviteeProfile?.email) {
    try {
      await sendGroupInviteEmail({
        to: inviteeProfile.email,
        displayName: inviteeProfile.display_name || 'there',
        groupName: group.name,
        groupId,
        invitedByName: inviterProfile?.display_name || undefined,
      })
    } catch (err) {
      console.error('Group invite email failed (non-fatal):', err)
    }
  }

  return NextResponse.json(member, { status: 201 })
}

// DELETE /api/groups/[groupId]/members
// Body: { user_id: string }
// Removes a member from the group.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { user_id } = body

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const admin = getServiceClient()

  // Only owners/admins can remove others; anyone can remove themselves
  if (user_id !== user.id) {
    const { data: myMembership } = await admin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await admin
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
