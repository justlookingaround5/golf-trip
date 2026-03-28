import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTripChatMessages, getDmChatMessages } from '@/lib/v2/messages-data'
import ChatClient from '@/app/trip/[tripId]/chat/chat-client'
import DmChatClient from './dm-chat-client'

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params

  // threadId format: "trip-{tripId}" for trip chats
  const tripIdMatch = threadId.match(/^trip-(.+)$/)

  // threadId format: "dm-{userId1}-{userId2}" for DMs (UUIDs are 8-4-4-4-12 hex)
  const dmMatch = threadId.match(/^dm-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)

  if (dmMatch) {
    const [, userId1, userId2] = dmMatch
    const data = await getDmChatMessages(userId1, userId2)
    if (!data) redirect('/admin/login')

    return (
      <DmChatClient
        friendUserId={data.friendUserId}
        currentUserId={data.currentUserId}
        initialMessages={data.initialMessages}
        currentUserProfile={data.currentUserProfile}
        friendName={data.friendName}
        friendAvatarUrl={data.friendAvatarUrl}
      />
    )
  }

  if (!tripIdMatch) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <header className="bg-golf-800 px-4 pt-14 pb-4 text-white flex items-center gap-3">
          <Link href="/messages" className="text-golf-300 hover:text-white transition shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">Messages</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Thread not found</p>
        </div>
      </div>
    )
  }

  const tripId = tripIdMatch[1]
  const data = await getTripChatMessages(tripId)
  if (!data) redirect('/admin/login')

  return (
    <ChatClient
      tripId={data.tripId}
      tripName={data.tripName}
      tripCoverImageUrl={data.tripCoverImageUrl}
      currentUserId={data.currentUserId}
      initialMessages={data.initialMessages}
      currentUserProfile={data.currentUserProfile}
    />
  )
}
