'use client'

const DOT_OPTIONS = [
  { key: 'greenie', label: 'Greenie', icon: '🟢', desc: 'On green, made par (par 3)', negative: false },
  { key: 'sandy', label: 'Sandy', icon: '🏖️', desc: 'Up & down from bunker', negative: false },
  { key: 'barkie', label: 'Barkie', icon: '🌳', desc: 'Hit tree, made par', negative: false },
  { key: 'polie', label: 'Polie', icon: '1️⃣', desc: 'One-putt', negative: false },
  { key: 'chippy', label: 'Chippy', icon: '⛳', desc: 'Chip in', negative: false },
  { key: 'water', label: 'Water', icon: '💧', desc: 'Hit water', negative: true },
  { key: 'ob', label: 'OB', icon: '🚫', desc: 'Out of bounds', negative: true },
  { key: 'three_putt', label: '3-Putt', icon: '😬', desc: 'Three putts', negative: true },
]

interface DotsTrackerProps {
  holeNumber: number
  par: number
  players: { id: string; name: string }[]
  enabledDots: string[]
  onUpdate: (playerId: string, holeNumber: number, dots: string[]) => void
  currentDots: Record<string, Record<number, string[]>>
}

export default function DotsTracker({ holeNumber, par, players, enabledDots, onUpdate, currentDots }: DotsTrackerProps) {
  const available = DOT_OPTIONS.filter(d => {
    if (!enabledDots.includes(d.key)) return false
    if (d.key === 'greenie' && par !== 3) return false
    return true
  })

  if (available.length === 0) return null

  function toggle(playerId: string, dotKey: string) {
    if (navigator.vibrate) navigator.vibrate(10)
    const current = currentDots[playerId]?.[holeNumber] || []
    const updated = current.includes(dotKey) ? current.filter(d => d !== dotKey) : [...current, dotKey]
    onUpdate(playerId, holeNumber, updated)
  }

  return (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mt-3">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">Dots — Hole {holeNumber}</p>
      {players.map(player => {
        const hits = currentDots[player.id]?.[holeNumber] || []
        return (
          <div key={player.id} className="mb-2 last:mb-0">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{player.name}</p>
            <div className="flex flex-wrap gap-1">
              {available.map(dot => {
                const active = hits.includes(dot.key)
                return (
                  <button
                    key={dot.key}
                    onClick={() => toggle(player.id, dot.key)}
                    title={dot.desc}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                      active
                        ? (dot.negative ? 'bg-red-600 text-white' : 'bg-green-600 text-white')
                        : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {dot.icon} {dot.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
