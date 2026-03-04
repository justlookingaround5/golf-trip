export default function PersonalStats({
  totalRounds,
  totalWinnings,
  bestGross,
  tripsCount,
}: {
  totalRounds: number
  totalWinnings: number
  bestGross: number | null
  tripsCount: number
}) {
  const stats = [
    { label: 'Trips', value: tripsCount.toString() },
    { label: 'Rounds Played', value: totalRounds.toString() },
    {
      label: 'Total Winnings',
      value: totalWinnings >= 0
        ? `+$${totalWinnings.toFixed(0)}`
        : `-$${Math.abs(totalWinnings).toFixed(0)}`,
    },
    { label: 'Best Round', value: bestGross ? bestGross.toString() : '—' },
  ]

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-gray-900">Career Stats</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
