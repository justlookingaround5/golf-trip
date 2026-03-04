'use client'

import { useState } from 'react'

interface PlayerScoreInputProps {
  name: string
  strokes: number
  score: number
  par: number
  isOwn?: boolean
  onAdjust: (delta: number) => void
  onSet: (value: number) => void
  fairwayHit?: boolean | null
  girHit?: boolean | null
  puttsCount?: number | null
  onStatsChange?: (stats: { fairway_hit?: boolean | null; gir?: boolean | null; putts?: number | null }) => void
}

export default function PlayerScoreInput({
  name,
  strokes,
  score,
  par,
  isOwn,
  onAdjust,
  onSet,
  fairwayHit,
  girHit,
  puttsCount,
  onStatsChange,
}: PlayerScoreInputProps) {
  const [showStats, setShowStats] = useState(false)

  // Wider range: par-2 to par+4
  const presets: number[] = []
  for (let i = Math.max(1, par - 2); i <= par + 4; i++) {
    presets.push(i)
  }

  // Stroke dots instead of text
  const strokeDots = strokes > 0 ? (
    <span className="text-green-600 text-sm tracking-tight">
      {'•'.repeat(strokes)}
    </span>
  ) : null

  return (
    <div className={`rounded-lg px-3 py-3 ${isOwn ? 'bg-golf-50 border border-golf-200' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {name}
            {isOwn && <span className="ml-1.5 text-xs text-golf-600">(You)</span>}
          </p>
          {strokeDots}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdjust(-1)}
            disabled={score <= 1}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-2xl font-bold text-red-700 active:bg-red-200 disabled:opacity-30"
          >
            &minus;
          </button>
          <span className="w-10 text-center text-2xl font-bold text-gray-900">
            {score}
          </span>
          <button
            type="button"
            onClick={() => onAdjust(1)}
            disabled={score >= 20}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl font-bold text-green-700 active:bg-green-200 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {/* Quick presets - wider range with par highlighted */}
      <div className="flex justify-center gap-1.5">
        {presets.map(v => (
          <button
            key={v}
            onClick={() => onSet(v)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              score === v
                ? 'bg-golf-700 text-white'
                : v === par
                  ? 'bg-golf-100 text-golf-800 border border-golf-300'
                  : 'bg-gray-200 text-gray-600'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Optional hole stats toggles */}
      {isOwn && onStatsChange && (
        <div className="mt-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-[10px] text-gray-400 hover:text-gray-600"
          >
            {showStats ? 'Hide stats' : '+ Stats'}
          </button>
          {showStats && (
            <div className="flex items-center gap-3 mt-1.5">
              {/* Fairway */}
              {par > 3 && (
                <button
                  onClick={() => onStatsChange({ fairway_hit: fairwayHit === true ? null : true })}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                    fairwayHit === true
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : fairwayHit === false
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  FW {fairwayHit === true ? '✓' : fairwayHit === false ? '✗' : '—'}
                </button>
              )}
              {par > 3 && fairwayHit !== null && fairwayHit !== undefined && (
                <button
                  onClick={() => onStatsChange({ fairway_hit: !fairwayHit })}
                  className="text-[9px] text-gray-400"
                >
                  flip
                </button>
              )}

              {/* GIR */}
              <button
                onClick={() => onStatsChange({ gir: girHit === true ? null : true })}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                  girHit === true
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : girHit === false
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                GIR {girHit === true ? '✓' : girHit === false ? '✗' : '—'}
              </button>
              {girHit !== null && girHit !== undefined && (
                <button
                  onClick={() => onStatsChange({ gir: !girHit })}
                  className="text-[9px] text-gray-400"
                >
                  flip
                </button>
              )}

              {/* Putts */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">Putts:</span>
                {[1, 2, 3].map(p => (
                  <button
                    key={p}
                    onClick={() => onStatsChange({ putts: puttsCount === p ? null : p })}
                    className={`h-5 w-5 rounded text-[10px] font-medium ${
                      puttsCount === p
                        ? 'bg-golf-700 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
