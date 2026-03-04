'use client'

import { useState, useEffect } from 'react'
import type { ScorecardColumnKey } from '@/lib/types'

const ALL_COLUMNS: { key: ScorecardColumnKey; label: string; desc: string }[] = [
  { key: 'gross', label: 'Gross', desc: 'Raw score' },
  { key: 'net', label: 'Net', desc: 'After handicap strokes' },
  { key: 'vs_par', label: 'vs Par', desc: '+/- relative to par' },
  { key: 'handicap_strokes', label: 'Strokes', desc: 'Handicap strokes received' },
  { key: 'skins_status', label: 'Skins', desc: 'Skin won/carried' },
  { key: 'nassau_status', label: 'Nassau', desc: 'Holes up/down' },
  { key: 'stableford_points', label: 'Stableford', desc: 'Points per hole' },
  { key: 'game_points', label: 'Game Pts', desc: 'Points from active game' },
  { key: 'running_total', label: 'Running', desc: 'Cumulative score' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (columns: ScorecardColumnKey[]) => void
}

export default function ScorecardSettings({ isOpen, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<Set<ScorecardColumnKey>>(new Set(['gross', 'net', 'vs_par']))
  const [viewMode, setViewMode] = useState('standard')

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/scorecard/preferences')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.visible_columns) setSelected(new Set(data.visible_columns))
        if (data?.view_mode) setViewMode(data.view_mode)
      })
      .catch(() => {})
  }, [isOpen])

  function toggle(key: ScorecardColumnKey) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  async function handleSave() {
    const cols = Array.from(selected)
    await fetch('/api/scorecard/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_columns: cols, view_mode: viewMode }),
    })
    onSave(cols)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Scorecard Columns</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
          {ALL_COLUMNS.map(col => (
            <button
              key={col.key}
              onClick={() => toggle(col.key)}
              className={`w-full flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition ${
                selected.has(col.key)
                  ? 'bg-golf-50 border border-golf-300'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div>
                <span className="font-medium text-gray-900">{col.label}</span>
                <p className="text-xs text-gray-500">{col.desc}</p>
              </div>
              {selected.has(col.key) && <span className="text-golf-600">&#10003;</span>}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">View Mode</p>
          <div className="flex gap-2">
            {['compact', 'standard', 'expanded'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`flex-1 rounded-md py-2 text-xs font-medium capitalize ${
                  viewMode === m
                    ? 'bg-golf-700 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSave}
          className="w-full rounded-md bg-golf-700 py-3 font-medium text-white hover:bg-golf-800"
        >
          Save Preferences
        </button>
      </div>
    </div>
  )
}
