'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const TEE_OPTIONS = [
  { name: 'Black', color: 'bg-gray-900', text: 'text-white' },
  { name: 'Blue', color: 'bg-blue-700', text: 'text-white' },
  { name: 'White', color: 'bg-white border border-gray-300', text: 'text-gray-900' },
  { name: 'Gold', color: 'bg-yellow-500', text: 'text-white' },
  { name: 'Red', color: 'bg-red-600', text: 'text-white' },
]

interface PlayerTee {
  trip_player_id: string
  player_name: string
  tee_name: string
  course_handicap: number | null
}

export default function TeeSelectionPage() {
  const params = useParams<{ tripId: string; courseId: string }>()
  const { tripId, courseId } = params

  const [players, setPlayers] = useState<PlayerTee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [playersRes, teesRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/players`),
        fetch(`/api/trips/${tripId}/rounds/${courseId}/tees`),
      ])
      const tripPlayers = playersRes.ok ? await playersRes.json() : []
      const existingTees = teesRes.ok ? await teesRes.json() : []

      const merged = tripPlayers.map((tp: { id: string; player: { name: string } | { name: string }[] }) => {
        const existing = existingTees.find((t: { trip_player_id: string }) => t.trip_player_id === tp.id)
        const player = Array.isArray(tp.player) ? tp.player[0] : tp.player
        return {
          trip_player_id: tp.id,
          player_name: player?.name || 'Unknown',
          tee_name: existing?.tee_name || 'White',
          course_handicap: existing?.course_handicap ?? null,
        }
      })
      setPlayers(merged)
      setLoading(false)
    }
    load()
  }, [tripId, courseId])

  async function handleTeeChange(tripPlayerId: string, teeName: string) {
    setPlayers(prev => prev.map(p =>
      p.trip_player_id === tripPlayerId ? { ...p, tee_name: teeName } : p
    ))
    const res = await fetch(`/api/trips/${tripId}/rounds/${courseId}/tees`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_player_id: tripPlayerId, tee_name: teeName }),
    })
    if (res.ok) {
      const updated = await res.json()
      if (updated.course_handicap != null) {
        setPlayers(prev => prev.map(p =>
          p.trip_player_id === tripPlayerId ? { ...p, course_handicap: updated.course_handicap } : p
        ))
      }
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tee Selection</h2>
        <p className="text-sm text-gray-500">Choose tees for each player on this round.</p>
      </div>
      <div className="space-y-3">
        {players.map(p => (
          <div key={p.trip_player_id} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{p.player_name}</span>
              {p.course_handicap != null && (
                <span className="text-xs text-gray-500">CH: {p.course_handicap}</span>
              )}
            </div>
            <div className="flex gap-2">
              {TEE_OPTIONS.map(tee => (
                <button
                  key={tee.name}
                  onClick={() => handleTeeChange(p.trip_player_id, tee.name)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    p.tee_name === tee.name
                      ? 'ring-2 ring-green-600 ring-offset-1'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 rounded-full ${tee.color}`} />
                  {tee.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
