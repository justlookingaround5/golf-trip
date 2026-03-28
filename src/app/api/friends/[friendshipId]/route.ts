import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// PUT /api/friends/[friendshipId] — accept or decline a friend request
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { friendshipId } = await params
  const body = await req.json()
  const { action } = body as { action: 'accept' | 'decline' }

  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
  }

  // Only the addressee can accept/decline
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .eq('id', friendshipId)
    .maybeSingle()

  if (!friendship) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (friendship.addressee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const newStatus = action === 'accept' ? 'accepted' : 'declined'
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: newStatus })
    .eq('id', friendshipId)
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/profile')
  revalidatePath(`/profile/${friendship.addressee_id}`)
  revalidatePath(`/profile/${friendship.requester_id}`)

  return NextResponse.json(data)
}

// DELETE /api/friends/[friendshipId] — unfriend or cancel request
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { friendshipId } = await params

  // Fetch before deleting so we can revalidate both users' profiles
  const { data: friendship } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('id', friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .maybeSingle()

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (friendship) {
    revalidatePath('/profile')
    revalidatePath(`/profile/${friendship.requester_id}`)
    revalidatePath(`/profile/${friendship.addressee_id}`)
  }

  return NextResponse.json({ ok: true })
}
