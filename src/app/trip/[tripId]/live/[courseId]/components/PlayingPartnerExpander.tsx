'use client'

import { useState } from 'react'
import PlayerScoreInput from './PlayerScoreInput'

interface PartnerData {
  tripPlayerId: string
  name: string
  strokes: number
  score: number
  par: number
}

interface PlayingPartnerExpanderProps {
  partners: PartnerData[]
  onAdjust: (tripPlayerId: string, delta: number) => void
  onSet: (tripPlayerId: string, value: number) => void
}

export default function PlayingPartnerExpander({
  partners,
  onAdjust,
  onSet,
}: PlayingPartnerExpanderProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (partners.length === 0) return null

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Playing Partners
      </p>
      {partners.map(p => (
        <div key={p.tripPlayerId}>
          <button
            onClick={() => toggle(p.tripPlayerId)}
            className="w-full flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-left"
          >
            <span className="text-sm font-medium text-gray-700">{p.name}</span>
            <div className="flex items-center gap-2">
              {p.score > 0 && (
                <span className="text-sm font-bold text-gray-900">{p.score}</span>
              )}
              <span className="text-gray-400 text-xs">
                {expanded.has(p.tripPlayerId) ? '▲' : '▼'}
              </span>
            </div>
          </button>
          {expanded.has(p.tripPlayerId) && (
            <div className="mt-1">
              <PlayerScoreInput
                name={p.name}
                strokes={p.strokes}
                score={p.score}
                par={p.par}
                onAdjust={(d) => onAdjust(p.tripPlayerId, d)}
                onSet={(v) => onSet(p.tripPlayerId, v)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
