type ActivityItem = {
  id: string
  money: number
  points: number
  game_name: string | null
  computed_at: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-gray-900">Recent Activity</h2>
      {activity.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {activity.map(item => (
              <li key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.game_name || 'Game'}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(item.computed_at)}</p>
                </div>
                <div className="text-right">
                  {item.money !== 0 && (
                    <p className={`text-sm font-semibold ${item.money > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.money > 0 ? '+' : ''}${item.money.toFixed(0)}
                    </p>
                  )}
                  {item.points !== 0 && (
                    <p className="text-xs text-gray-500">{item.points} pts</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No game results yet. Play some golf!</p>
        </div>
      )}
    </section>
  )
}
