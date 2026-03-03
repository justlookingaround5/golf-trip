import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postActivity } from '@/lib/activity'

/**
 * POST /api/trips/[tripId]/photos
 *
 * Accepts multipart form data with:
 *   - file: the image file
 *   - caption: optional text
 *   - hole_number: optional hole number
 *   - course_id: optional course reference
 *
 * Uploads to Supabase Storage, creates activity feed entry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const caption = formData.get('caption') as string | null
  const holeNumber = formData.get('hole_number') as string | null
  const courseId = formData.get('course_id') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${user.id}/${tripId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('trip-photos')
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('trip-photos')
    .getPublicUrl(filename)

  const photoUrl = urlData.publicUrl

  // Find user's trip_player_id
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let tripPlayerId: string | null = null
  let playerName = 'Someone'

  if (player) {
    const { data: tripPlayer } = await supabase
      .from('trip_players')
      .select('id, player:players(name)')
      .eq('trip_id', tripId)
      .eq('player_id', player.id)
      .single()

    if (tripPlayer) {
      tripPlayerId = tripPlayer.id
      const p = Array.isArray(tripPlayer.player) ? tripPlayer.player[0] : tripPlayer.player
      playerName = (p as { name: string } | null)?.name || 'Someone'
    }
  }

  // Find hole_id if hole_number + course_id provided
  let holeId: string | null = null
  if (holeNumber && courseId) {
    const { data: hole } = await supabase
      .from('holes')
      .select('id')
      .eq('course_id', courseId)
      .eq('hole_number', parseInt(holeNumber))
      .single()
    holeId = hole?.id || null
  }

  // Post to activity feed
  const title = caption
    ? `${playerName}: ${caption}`
    : holeNumber
      ? `${playerName} shared a photo from Hole ${holeNumber}`
      : `${playerName} shared a photo`

  await postActivity({
    trip_id: tripId,
    event_type: 'photo',
    title,
    detail: caption || undefined,
    photo_url: photoUrl,
    trip_player_id: tripPlayerId || undefined,
    course_id: courseId || undefined,
    hole_id: holeId || undefined,
  })

  return NextResponse.json({
    url: photoUrl,
    filename,
  }, { status: 201 })
}
