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

function ScoreCell({
  gross,
  par,
  isMe,
  isActive,
}: {
  gross: number | null | undefined
  par: number
  isMe?: boolean
  isActive?: boolean
}) {
  if (gross == null) {
    if (isMe) {
      return (
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 text-xs font-semibold ${
            isActive
              ? 'border-golf-600 bg-golf-50 text-golf-700'
              : 'border-dashed border-gray-300 text-gray-400'
          }`}
        >
          —
        </span>
      )
    }
    return <span className="text-xs text-gray-300">—</span>
  }

  const diff = gross - par

  if (isMe) {
    let cls = 'bg-white border border-gray-200 text-gray-700'
    if (diff <= -1) cls = 'bg-red-50 border border-red-300 text-red-700 font-bold'
    else if (diff === 1) cls = 'bg-blue-50 border border-blue-300 text-blue-700'
    else if (diff >= 2) cls = 'bg-blue-100 border border-blue-400 text-blue-900 font-bold'
    return (
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${cls} ${
          isActive ? 'ring-2 ring-golf-600' : ''
        }`}
      >
        {gross}
      </span>
    )
  }

  // Other players — read-only score indicators
  if (diff <= -2) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-yellow-400 text-yellow-600 font-bold text-xs">{gross}</span>
  if (diff === -1) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-red-400 text-red-600 font-bold text-xs">{gross}</span>
  if (diff === 0)  return <span className="text-xs text-gray-700">{gross}</span>
  if (diff === 1)  return <span className="inline-flex h-6 w-6 items-center justify-center ring-1 ring-blue-400 text-blue-600 text-xs">{gross}</span>
  return <span className="inline-flex h-6 w-6 items-center justify-center ring-2 ring-blue-500 text-blue-800 font-bold text-xs">{gross}</span>
}

export default function ScorecardEditor({ scorecard, currentUserId, onSave }: ScorecardEditorProps) {
  const [activeHole, setActiveHole] = useState(1)
  const [editScore, setEditScore] = useState<number | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  const me = scorecard.players.find(p => p.player.id === currentUserId) ?? scorecard.players[0]
  const allHoles = me?.holes ?? []
  const frontHoles = allHoles.filter(h => h.holeNumber <= 9)
  const backHoles  = allHoles.filter(h => h.holeNumber > 9)
  const showBack   = backHoles.length > 0
  const activeHoleData = me?.holes.find(h => h.holeNumber === activeHole)

  function openEdit(hole: number) {
    setActiveHole(hole)
    setEditScore(me?.holes.find(h => h.holeNumber === hole)?.gross ?? null)
    setShowPopup(true)
  }

  function saveScore() {
    if (editScore !== null && onSave) onSave(activeHole, editScore)
    setShowPopup(false)
  }

  function HoleRow({ refHole, idx }: { refHole: typeof allHoles[0]; idx: number }) {
    const isActive = activeHole === refHole.holeNumber
    return (
      <button
        onClick={() => openEdit(refHole.holeNumber)}
        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition ${
          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        } ${isActive ? 'ring-inset ring-2 ring-golf-400' : 'hover:bg-golf-50'}`}
      >
        <div className="w-16 shrink-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">{refHole.holeNumber}</p>
          <p className="text-[10px] text-gray-400 leading-tight">
            Par {refHole.par}{refHole.handicapIndex != null ? ` · ${refHole.handicapIndex}` : ''}
          </p>
        </div>
        <div className="flex-1 flex items-center">
          {scorecard.players.map(({ player, holes }) => {
            const h = holes.find(x => x.holeNumber === refHole.holeNumber)
            return (
              <div key={player.id} className="flex-1 flex justify-center">
                <ScoreCell
                  gross={h?.gross}
                  par={refHole.par}
                  isMe={player.id === currentUserId}
                  isActive={isActive}
                />
              </div>
            )
          })}
        </div>
      </button>
    )
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

      {/* Vertical scorecard */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Player name header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-golf-800">
          <div className="w-16 shrink-0" />
          <div className="flex-1 flex items-center">
            {scorecard.players.map(({ player }) => (
              <div
                key={player.id}
                className={`flex-1 text-center text-[11px] font-semibold truncate ${
                  player.id === currentUserId ? 'text-white' : 'text-golf-300'
                }`}
              >
                {player.id === currentUserId ? `${player.name} ✎` : player.name}
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Front 9 */}
          {frontHoles.map((refHole, idx) => (
            <HoleRow key={refHole.holeId} refHole={refHole} idx={idx} />
          ))}

          {/* Out subtotal */}
          {frontHoles.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-100">
              <div className="w-16 shrink-0">
                <p className="text-xs font-bold text-gray-600">Out</p>
              </div>
              <div className="flex-1 flex items-center">
                {scorecard.players.map(({ player, holes }) => {
                  const total = holes.filter(h => h.holeNumber <= 9).reduce((s, h) => s + (h.gross ?? 0), 0)
                  return (
                    <div key={player.id} className="flex-1 text-center text-xs font-bold text-gray-700">
                      {total || '—'}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Back 9 */}
          {showBack && backHoles.map((refHole, idx) => (
            <HoleRow key={refHole.holeId} refHole={refHole} idx={idx} />
          ))}

          {/* In subtotal */}
          {showBack && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-100">
              <div className="w-16 shrink-0">
                <p className="text-xs font-bold text-gray-600">In</p>
              </div>
              <div className="flex-1 flex items-center">
                {scorecard.players.map(({ player, holes }) => {
                  const total = holes
                    .filter(h => h.holeNumber >= 10 && h.holeNumber <= 18)
                    .reduce((s, h) => s + (h.gross ?? 0), 0)
                  return (
                    <div key={player.id} className="flex-1 text-center text-xs font-bold text-gray-700">
                      {total || '—'}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Total row */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-golf-800">
            <div className="w-16 shrink-0">
              <p className="text-xs font-bold text-white">Total</p>
            </div>
            <div className="flex-1 flex items-center">
              {scorecard.players.map(({ player, grossTotal }) => (
                <div key={player.id} className="flex-1 text-center text-sm font-black text-white">
                  {grossTotal ?? '—'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Score entry popup */}
      {showPopup && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowPopup(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg">
            <div className="m-3 rounded-2xl bg-white p-5 shadow-2xl">
              <p className="text-sm font-bold text-gray-900 mb-1">
                Hole {activeHole} — Par {activeHoleData?.par}
              </p>
              <p className="text-xs text-gray-500 mb-4">Enter gross score</p>

              {/* Score stepper */}
              <div className="flex items-center justify-center gap-6 mb-5">
                <button
                  onClick={() => setEditScore(s => Math.max(1, (s ?? activeHoleData?.par ?? 4) - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-200 text-2xl font-bold text-gray-600 hover:border-golf-400 transition"
                >
                  −
                </button>
                <span className="text-5xl font-black text-gray-900 w-16 text-center tabular-nums">
                  {editScore ?? '—'}
                </span>
                <button
                  onClick={() => setEditScore(s => (s ?? activeHoleData?.par ?? 4) + 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-200 text-2xl font-bold text-gray-600 hover:border-golf-400 transition"
                >
                  +
                </button>
              </div>

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
