'use client'

import { useState } from 'react'
import type { GameFormat, RoundGame } from '@/lib/types'

interface TripPlayerWithPlayer {
  id: string
  player?: { name: string } | { name: string }[]
}

interface GameSetupClientProps {
  tripId: string
  courseId: string
  formats: GameFormat[]
  tripPlayers: TripPlayerWithPlayer[]
  existingGames: RoundGame[]
  defaultSkinsMode: 'gross' | 'net'
  defaultSkinsBuyIn: number
}

export default function GameSetupClient({
  tripId,
  courseId,
  formats,
  tripPlayers,
  existingGames,
  defaultSkinsMode,
  defaultSkinsBuyIn,
}: GameSetupClientProps) {
  const [games, setGames] = useState<RoundGame[]>(existingGames)
  const [error, setError] = useState<string | null>(null)

  // ── Skins state ──────────────────────────────────────────────────────────
  const skinsFormat = formats.find(f => f.engine_key === 'skins')
  const skinsGame = games.find(
    g => g.game_format?.engine_key === 'skins' ||
      (skinsFormat && g.game_format_id === skinsFormat.id)
  )

  const [skinsMode, setSkinsMode] = useState<'gross' | 'net'>(defaultSkinsMode)
  const [skinsBuyIn, setSkinsBuyIn] = useState(defaultSkinsBuyIn)
  const [enablingSkins, setEnablingSkins] = useState(false)
  const [removingSkins, setRemovingSkins] = useState(false)

  // ── Other games state ─────────────────────────────────────────────────────
  const otherGames = games.filter(
    g => g.game_format?.engine_key !== 'skins' &&
      !(skinsFormat && g.game_format_id === skinsFormat.id)
  )

  const nonSkinsFormats = formats.filter(f => f.engine_key !== 'skins')
  const tier1 = nonSkinsFormats.filter(f => f.tier === 1)
  const tier2 = nonSkinsFormats.filter(f => f.tier === 2)

  const [showAdd, setShowAdd] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [buyIn, setBuyIn] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  const selectedFormatObj = formats.find(f => f.id === selectedFormat)

  function togglePlayer(playerId: string) {
    setSelectedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function selectAllPlayers() {
    setSelectedPlayers(new Set(tripPlayers.map(tp => tp.id)))
  }

  const playerName = (tp: TripPlayerWithPlayer) => {
    const p = Array.isArray(tp.player) ? tp.player[0] : tp.player
    return p?.name || 'Unknown'
  }

  async function reloadGames() {
    const res = await fetch(`/api/trips/${tripId}/rounds/${courseId}/games`)
    if (res.ok) setGames(await res.json())
  }

  // ── Skins handlers ────────────────────────────────────────────────────────
  async function handleEnableSkins() {
    if (!skinsFormat) {
      setError('Skins game format not found')
      return
    }
    setEnablingSkins(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/rounds/${courseId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_format_id: skinsFormat.id,
          player_ids: tripPlayers.map(tp => tp.id),
          buy_in: skinsBuyIn,
          config: { mode: skinsMode, carry_over: true, value_per_skin: skinsBuyIn },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to enable skins')
        return
      }
      await reloadGames()
    } catch {
      setError('Something went wrong')
    } finally {
      setEnablingSkins(false)
    }
  }

  async function handleRemoveSkins() {
    if (!skinsGame) return
    setRemovingSkins(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/trips/${tripId}/rounds/${courseId}/games?round_game_id=${skinsGame.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to remove skins')
        return
      }
      setGames(prev => prev.filter(g => g.id !== skinsGame.id))
    } catch {
      setError('Something went wrong')
    } finally {
      setRemovingSkins(false)
    }
  }

  async function handleComputeSkins() {
    if (!skinsGame) return
    try {
      const res = await fetch(`/api/games/${skinsGame.id}/compute`, { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        alert(`Skins computed: ${result.summary}`)
        await reloadGames()
      } else {
        alert('Failed to compute skins')
      }
    } catch {
      alert('Failed to compute skins')
    }
  }

  // ── Other game handlers ───────────────────────────────────────────────────
  async function handleAddGame() {
    if (!selectedFormat || selectedPlayers.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/rounds/${courseId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_format_id: selectedFormat,
          player_ids: Array.from(selectedPlayers),
          buy_in: buyIn,
          config: selectedFormatObj?.default_config || {},
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add game')
        return
      }
      await reloadGames()
      setShowAdd(false)
      setSelectedFormat('')
      setSelectedPlayers(new Set())
      setBuyIn(0)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleCompute(roundGameId: string) {
    try {
      const res = await fetch(`/api/games/${roundGameId}/compute`, { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        alert(`Computed: ${result.summary}`)
        await reloadGames()
      }
    } catch {
      alert('Failed to compute results')
    }
  }

  // ── Config display helper ─────────────────────────────────────────────────
  const getSkinsGameMode = (game: RoundGame): string => {
    const config = game.config as Record<string, unknown> | undefined
    return config?.mode === 'gross' ? 'Gross' : 'Net'
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Skins Section ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h3 className="font-semibold text-gray-900">Skins</h3>
        </div>

        {skinsGame ? (
          /* Skins enabled — show summary */
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Enabled
              </span>
              <span className="text-sm text-gray-600">
                {getSkinsGameMode(skinsGame)} skins
                {skinsGame.buy_in > 0 && ` · $${skinsGame.buy_in} buy-in`}
                {` · ${(skinsGame.round_game_players as unknown[])?.length ?? 0} players`}
              </span>
            </div>
            <div className="flex gap-2">
              {skinsGame.status !== 'finalized' && (
                <button
                  onClick={handleComputeSkins}
                  className="rounded-md bg-golf-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-golf-800"
                >
                  Compute Results
                </button>
              )}
              <button
                onClick={handleRemoveSkins}
                disabled={removingSkins}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {removingSkins ? 'Removing...' : 'Remove Skins'}
              </button>
            </div>
          </div>
        ) : (
          /* Skins not enabled — show setup form */
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Skins are not enabled for this round. Enable them below.
            </p>

            {/* Gross / Net toggle */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Scoring
              </label>
              <div className="flex w-fit rounded-md border border-gray-200 overflow-hidden text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setSkinsMode('net')}
                  className={`px-5 py-2 transition-colors ${
                    skinsMode === 'net'
                      ? 'bg-golf-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Net
                </button>
                <button
                  type="button"
                  onClick={() => setSkinsMode('gross')}
                  className={`px-5 py-2 border-l border-gray-200 transition-colors ${
                    skinsMode === 'gross'
                      ? 'bg-golf-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Gross
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {skinsMode === 'net'
                  ? 'Net scores (after handicap strokes) determine the winner on each hole.'
                  : 'Gross scores (no handicap) determine the winner on each hole.'}
              </p>
            </div>

            {/* Buy-in */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Buy-in per player ($)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={skinsBuyIn}
                onChange={e => setSkinsBuyIn(Number(e.target.value))}
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <p className="text-xs text-gray-400">
              All {tripPlayers.length} players in the trip will be included.
            </p>

            <button
              onClick={handleEnableSkins}
              disabled={enablingSkins || !skinsFormat}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
            >
              {enablingSkins ? 'Enabling...' : 'Enable Skins for This Round'}
            </button>
          </div>
        )}
      </div>

      {/* ── Other Games ───────────────────────────────────────────────────── */}
      {otherGames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Other Games on This Round
          </h3>
          {otherGames.map(game => {
            const format = game.game_format || formats.find(f => f.id === game.game_format_id)
            const players = game.round_game_players || []
            return (
              <div
                key={game.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{format?.icon || '⛳'}</span>
                      <h4 className="font-semibold text-gray-900">
                        {format?.name || 'Unknown Game'}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {players.length} players · ${game.buy_in} buy-in · {game.status}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(players as { id: string; side?: string | null; trip_player?: { player?: { name: string } | { name: string }[] } }[]).map((rgp) => {
                        const p = Array.isArray(rgp.trip_player?.player) ? rgp.trip_player?.player[0] : rgp.trip_player?.player
                        return (
                          <span
                            key={rgp.id}
                            className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {p?.name || 'Unknown'}
                            {rgp.side && ` (${rgp.side.replace('team_', '')})`}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {game.status !== 'finalized' && (
                      <button
                        onClick={() => handleCompute(game.id)}
                        className="rounded-md bg-golf-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-golf-800"
                      >
                        Compute
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add Other Game ────────────────────────────────────────────────── */}
      {!showAdd ? (
        <button
          onClick={() => { setShowAdd(true); selectAllPlayers() }}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white py-6 text-center text-sm font-medium text-gray-500 hover:border-golf-500 hover:text-golf-700"
        >
          + Add Game to This Round
        </button>
      ) : (
        <div className="rounded-lg border border-golf-200 bg-golf-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Add Game</h3>
            <button
              onClick={() => setShowAdd(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          {/* Format Picker (skins excluded) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Game Format
            </label>
            {tier1.length > 0 && (
              <>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-golf-700">
                  Essential
                </p>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {tier1.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormat(f.id)}
                      className={`rounded-lg border-2 p-3 text-left transition ${
                        selectedFormat === f.id
                          ? 'border-golf-600 bg-white shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg">{f.icon}</div>
                      <div className="text-sm font-semibold text-gray-900">{f.name}</div>
                      <div className="text-xs text-gray-500">{f.min_players}-{f.max_players} players</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {tier2.length > 0 && (
              <>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-golf-700">
                  Popular
                </p>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {tier2.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormat(f.id)}
                      className={`rounded-lg border-2 p-3 text-left transition ${
                        selectedFormat === f.id
                          ? 'border-golf-600 bg-white shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg">{f.icon}</div>
                      <div className="text-sm font-semibold text-gray-900">{f.name}</div>
                      <div className="text-xs text-gray-500">{f.min_players}-{f.max_players} players</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Rules Preview */}
          {selectedFormatObj?.description && (
            <div className="rounded-md bg-white border border-gray-200 p-3">
              <p className="text-sm text-gray-700">{selectedFormatObj.description}</p>
              {selectedFormatObj.scope === 'foursome' && (
                <p className="mt-1 text-xs text-amber-600">Foursome game — runs within the group</p>
              )}
              {selectedFormatObj.scope === 'group' && (
                <p className="mt-1 text-xs text-blue-600">Group game — runs across all players on this round</p>
              )}
            </div>
          )}

          {/* Player Selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Players</label>
              <button
                onClick={selectAllPlayers}
                className="text-xs text-golf-700 hover:text-golf-900"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tripPlayers.map(tp => (
                <button
                  key={tp.id}
                  onClick={() => togglePlayer(tp.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                    selectedPlayers.has(tp.id)
                      ? 'border-golf-600 bg-golf-50 font-medium text-golf-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {playerName(tp)}
                </button>
              ))}
            </div>
          </div>

          {/* Buy-In */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Buy-In ($)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={buyIn}
              onChange={e => setBuyIn(Number(e.target.value))}
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleAddGame}
            disabled={saving || !selectedFormat || selectedPlayers.size === 0}
            className="w-full rounded-md bg-golf-700 px-4 py-3 font-medium text-white hover:bg-golf-800 disabled:opacity-50"
          >
            {saving ? 'Adding...' : `Add ${selectedFormatObj?.name || 'Game'}`}
          </button>
        </div>
      )}
    </div>
  )
}
