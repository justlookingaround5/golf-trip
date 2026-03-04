import Link from 'next/link'

type UpcomingRound = {
  trip_id: string
  trip_name: string
  course_name: string
  round_date: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function daysUntil(dateStr: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return null
  return `${diff} days`
}

export default function UpcomingRounds({ rounds }: { rounds: UpcomingRound[] }) {
  if (rounds.length === 0) return null

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-gray-900">Upcoming Rounds</h2>
      <div className="space-y-3">
        {rounds.map((round, i) => {
          const countdown = daysUntil(round.round_date)
          return (
            <Link
              key={`${round.trip_id}-${round.course_name}-${i}`}
              href={`/trip/${round.trip_id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{round.course_name}</p>
                <p className="text-xs text-gray-500">{round.trip_name} &middot; {formatDate(round.round_date)}</p>
              </div>
              {countdown && (
                <span className="rounded-full bg-golf-100 px-2.5 py-0.5 text-xs font-medium text-golf-800">
                  {countdown}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
