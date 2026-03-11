'use client'

// STUB — wire this up to the live-scoring-client logic when ready.
// This component is the editable version used in the Active Round card.

import { useState } from 'react'
import type { ScorecardV2 } from '@/lib/v2/types'

interface ScorecardEditorProps {
  scorecard: ScorecardV2
  currentUserId: string
  onSave?: (holeNumber: number, score: number) => void
}

export default function ScorecardEditor({ scorecard, currentUserId, onSave }: ScorecardEditorProps) {
  const [activeHole, setActiveHole] = useState(1)
  const [editScore, setEditScore] = useState<number | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  const me = scorecard.players.find(p => p.player.id === currentUserId) ?? scorecard.players[0]
  const currentHoleData = me?.holes.find(h => h.holeNumber === activeHole)

  function openEdit(hole: number) {
    setActiveHole(hole)
    setEditScore(me?.holes.find(h => h.holeNumber === hole)?.gross ?? null)
    setShowPopup(true)
  }

  function saveScore() {
    if (editScore !== null && onSave) onSave(activeHole, editScore)
    setShowPopup(false)
  }

  return (
    <div className="space-y-4">
      {/* Course info */}
      <div>
        <p className="text-sm font-bold text-gray-900">{scorecard.courseName}</p>
        <p className="text-xs text-gray-500">
          {new Date(scorecard.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
          })}
          {' · '}Par {scorecard.par}
        </p>
      </div>

      {/* Hole selector grid */}
      <div className="grid grid-cols-9 gap-1">
        {me?.holes.map(h => {
          const hasScore = h.gross !== null
          const diff = hasScore ? h.gross! - h.par : null
          let cellColor = 'bg-gray-100 text-gray-500'
          if (hasScore && diff !== null) {
            if (diff <= -1) cellColor = 'bg-red-100 text-red-700 font-bold'
            else if (diff === 0) cellColor = 'bg-white text-gray-700 border border-gray-200'
            else if (diff === 1) cellColor = 'bg-blue-50 text-blue-700'
            else cellColor = 'bg-blue-100 text-blue-800 font-bold'
          }
          const isActive = h.holeNumber === activeHole

          return (
            <button
              key={h.holeId}
              onClick={() => openEdit(h.holeNumber)}
              className={`rounded-lg py-2 text-center text-xs transition ${cellColor} ${
                isActive ? 'ring-2 ring-golf-600' : ''
              }`}
            >
              <span className="block text-[9px] text-gray-400">{h.holeNumber}</span>
              <span className="block font-semibold">{hasScore ? h.gross : '—'}</span>
            </button>
          )
        })}
      </div>

      {/* Current hole detail */}
      {currentHoleData && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">Hole {activeHole}</p>
            <span className="text-xs text-gray-400">Par {currentHoleData.par} · HCP {currentHoleData.handicapIndex}</span>
          </div>
          <button
            onClick={() => openEdit(activeHole)}
            className="w-full rounded-lg bg-golf-800 py-2.5 text-sm font-semibold text-white hover:bg-golf-700 transition"
          >
            {currentHoleData.gross !== null ? `Edit Score (${currentHoleData.gross})` : 'Enter Score'}
          </button>
        </div>
      )}

      {/* Score entry popup */}
      {showPopup && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowPopup(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg">
            <div className="m-3 rounded-2xl bg-white p-5 shadow-2xl">
              <p className="text-sm font-bold text-gray-900 mb-1">
                Hole {activeHole} — Par {currentHoleData?.par}
              </p>
              <p className="text-xs text-gray-500 mb-4">Enter gross score</p>

              {/* Score stepper */}
              <div className="flex items-center justify-center gap-6 mb-5">
                <button
                  onClick={() => setEditScore(s => Math.max(1, (s ?? currentHoleData?.par ?? 4) - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-200 text-2xl font-bold text-gray-600 hover:border-golf-400 transition"
                >
                  −
                </button>
                <span className="text-5xl font-black text-gray-900 w-16 text-center tabular-nums">
                  {editScore ?? '—'}
                </span>
                <button
                  onClick={() => setEditScore(s => (s ?? currentHoleData?.par ?? 4) + 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-200 text-2xl font-bold text-gray-600 hover:border-golf-400 transition"
                >
                  +
                </button>
              </div>

              {/* STUB note — fairway/GIR/putts fields go here */}
              <p className="text-center text-xs text-gray-400 mb-4">
                Fairway · GIR · Putts fields — connect to live-scoring-client
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowPopup(false)}
                  className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveScore}
                  disabled={editScore === null}
                  className="rounded-xl bg-golf-800 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-golf-700 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
