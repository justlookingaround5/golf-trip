'use client'

import { useState, useEffect } from 'react'

interface RsvpData {
  id: string
  trip_player_id: string
  status: string
  preferred_tee: string | null
  trip_player?: {
    id: string
    player?: { name: string } | { name: string }[]
  }
}

interface RsvpCardProps {
  tripId: string
  courseId: string
  courseName: string
  roundDate: string | null
  tripPlayers: { id: string; player?: { name: string } | { name: string }[] }[]
  currentTripPlayerId: string | null
}

export default function RsvpCard({ tripId, courseId, courseName, roundDate, tripPlayers, currentTripPlayerId }: RsvpCardProps) {
  const [rsvps, setRsvps] = useState<RsvpData[]>([])
  const [myStatus, setMyStatus] = useState('pending')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/trips/${tripId}/rounds/${courseId}/rsvp`)
      .then(r => r.ok ? r.json() : [])
      .then((data: RsvpData[]) => {
        setRsvps(data)
        const mine = data.find(r => r.trip_player_id === currentTripPlayerId)
        if (mine) setMyStatus(mine.status)
      }).catch(() => {})
  }, [tripId, courseId, currentTripPlayerId])

  async function handleRsvp(status: string) {
    if (!currentTripPlayerId) return
    if (navigator.vibrate) navigator.vibrate(15)
    setSaving(true)
    setMyStatus(status)
    try {
      await fetch(`/api/trips/${tripId}/rounds/${courseId}/rsvp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_player_id: currentTripPlayerId, status }),
      })
      const res = await fetch(`/api/trips/${tripId}/rounds/${courseId}/rsvp`)
      if (res.ok) setRsvps(await res.json())
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  function getName(r: RsvpData): string {
    const p = Array.isArray(r.trip_player?.player) ? r.trip_player?.player[0] : r.trip_player?.player
    return p?.name || 'Unknown'
  }

  function getTripPlayerName(tp: { player?: { name: string } | { name: string }[] }): string {
    const p = Array.isArray(tp.player) ? tp.player[0] : tp.player
    return p?.name || 'Unknown'
  }

  const confirmed = rsvps.filter(r => r.status === 'confirmed')
  const declined = rsvps.filter(r => r.status === 'declined')
  const pending = tripPlayers.filter(tp => !rsvps.find(r => r.trip_player_id === tp.id))

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Tomorrow&apos;s Round</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{courseName}{roundDate ? ` — ${roundDate}` : ''}</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-green-700">{confirmed.length}</span>
          <span className="text-xs text-gray-500"> / {tripPlayers.length}</span>
        </div>
      </div>

      {currentTripPlayerId && (
        <div className="flex gap-2 mb-3">
          {[
            { status: 'confirmed', label: "I'm in", icon: '✅' },
            { status: 'maybe', label: 'Maybe', icon: '🤔' },
            { status: 'declined', label: 'Out', icon: '❌' },
          ].map(opt => (
            <button
              key={opt.status}
              onClick={() => handleRsvp(opt.status)}
              disabled={saving}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition ${
                myStatus === opt.status
                  ? 'bg-golf-700 text-white ring-2 ring-golf-500 ring-offset-1'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {confirmed.map(r => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-900 dark:text-white">✅ {getName(r)}</span>
            {r.preferred_tee && <span className="text-xs text-gray-500">{r.preferred_tee}</span>}
          </div>
        ))}
        {declined.map(r => (
          <div key={r.id} className="text-sm text-gray-400 line-through">{getName(r)}</div>
        ))}
        {pending.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Waiting on: {pending.map(tp => getTripPlayerName(tp)).join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
