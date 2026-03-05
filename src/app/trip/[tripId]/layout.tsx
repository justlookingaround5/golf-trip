import ChatAssistant from '@/components/ChatAssistant'

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params

  return (
    <>
      {children}
      <ChatAssistant tripId={tripId} />
    </>
  )
}
