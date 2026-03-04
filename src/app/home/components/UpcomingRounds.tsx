import Link from 'next/link'

type UpcomingRound = {
  trip_id: string
  trip_name: string
  course_name: string
  course_id: string
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
          const isToday = countdown === 'Today'

          return (
            <div
              key={`${round.trip_id}-${round.course_name}-${i}`}
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                isToday ? 'border-golf-300 ring-1 ring-golf-200' : 'border-gray-200'
              }`}
            >
              <Link
                href={`/trip/${round.trip_id}`}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{round.course_name}</p>
                  <p className="text-xs text-gray-500">{round.trip_name} &middot; {formatDate(round.round_date)}</p>
                </div>
                {countdown && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isToday ? 'bg-green-100 text-green-800' : 'bg-golf-100 text-golf-800'
                  }`}>
                    {countdown}
                  </span>
                )}
              </Link>
              {isToday && (
                <Link
                  href={`/trip/${round.trip_id}/live/${round.course_id}`}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white shadow-sm active:bg-green-700"
                >
                  <span>🏌️</span> Live Scoring
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
