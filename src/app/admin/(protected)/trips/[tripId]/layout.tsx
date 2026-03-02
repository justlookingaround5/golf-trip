import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const tabs = [
  { label: 'Overview', href: '' },
  { label: 'Courses', href: '/courses' },
  { label: 'Players', href: '/players' },
  { label: 'Teams', href: '/teams' },
  { label: 'Matches', href: '/matches' },
]

export default async function TripDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, year')
    .eq('id', tripId)
    .single()

  if (!trip) {
    notFound()
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-green-700 hover:underline">
            Trips
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{trip.name}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {trip.name} <span className="text-lg font-normal text-gray-500">({trip.year})</span>
        </h2>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => {
            const href = `/admin/trips/${tripId}${tab.href}`
            return (
              <Link
                key={tab.label}
                href={href}
                className="whitespace-nowrap border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {children}
    </div>
  )
}
