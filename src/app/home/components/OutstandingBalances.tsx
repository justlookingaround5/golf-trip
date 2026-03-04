type Balance = {
  player_name: string
  amount: number
}

export default function OutstandingBalances({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) return null

  const youOwe = balances.filter(b => b.amount < 0)
  const owedToYou = balances.filter(b => b.amount > 0)

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-gray-900">Balances</h2>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-100">
          {owedToYou.map(b => (
            <li key={b.player_name} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">{b.player_name}</span>
              <span className="text-sm font-semibold text-green-600">
                owes you ${b.amount.toFixed(0)}
              </span>
            </li>
          ))}
          {youOwe.map(b => (
            <li key={b.player_name} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">{b.player_name}</span>
              <span className="text-sm font-semibold text-red-600">
                you owe ${Math.abs(b.amount).toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
