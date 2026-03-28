'use client'

import { useState } from 'react'
import type { ActivityFeedItem } from '@/lib/types'

type Tab = 'leaderboard' | 'games' | 'feed'

interface LeaderboardEntry {
  tripPlayerId: string
  name: string
  grossTotal: number
  netTotal: number
  holesPlayed: number
  thru: string
  vsPar: number
}

interface GameInfo {
  id: string
  name: string
  icon: string
  buyIn: number
  status: string
  results: {
    tripPlayerId: string
    name: string
    points: number
    money: number
    position: number
  }[]
}

interface LiveDashboardProps {
  leaderboard: LeaderboardEntry[]
  games: GameInfo[]
  feed: ActivityFeedItem[]
  coursePar: number
  isQuickRound?: boolean
}

export default function LiveDashboard({
  leaderboard,
  games,
  feed,
  coursePar,
  isQuickRound,
}: LiveDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard')

  const allTabs: { key: Tab; label: string }[] = [
    { key: 'leaderboard', label: 'Board' },
    { key: 'games', label: 'Games' },
    { key: 'feed', label: 'Feed' },
  ]

  // Hide games and bets tabs for quick rounds
  const tabs = isQuickRound
    ? allTabs.filter(t => t.key === 'leaderboard' || t.key === 'feed')
    : allTabs

  return (
    <div className="mt-4">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-center text-sm font-medium transition ${
              activeTab === tab.key
                ? 'border-b-2 border-golf-700 text-golf-700'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-3">
        {activeTab === 'leaderboard' && (
          <LeaderboardTab entries={leaderboard} coursePar={coursePar} />
        )}
        {activeTab === 'games' && (
          <GamesTab games={games} />
        )}
        {activeTab === 'feed' && (
          <FeedTab feed={feed} />
        )}
      </div>
    </div>
  )
}

function LeaderboardTab({ entries, coursePar }: { entries: LeaderboardEntry[]; coursePar: number }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No scores yet</p>
  }

  const sorted = [...entries].sort((a, b) => a.netTotal - b.netTotal)

  return (
    <div className="space-y-1">
      {sorted.map((entry, i) => {
        const vsParNet = entry.netTotal - (coursePar * entry.holesPlayed / 18)
        const diff = entry.vsPar
        const diffStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`

        return (
          <div key={entry.tripPlayerId} className="flex items-center justify-between rounded-md px-3 py-2 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className={`w-5 text-center text-sm font-bold ${i === 0 ? 'text-golf-700' : 'text-gray-400'}`}>
                {i + 1}
              </span>
              <div>
                <span className="text-sm font-medium text-gray-900">{entry.name}</span>
                <span className="ml-2 text-xs text-gray-400">thru {entry.thru}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                {diffStr}
              </span>
              <span className="ml-2 text-xs text-gray-500">{entry.grossTotal}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GamesTab({ games }: { games: GameInfo[] }) {
  if (games.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No active games</p>
  }

  return (
    <div className="space-y-3">
      {games.map(game => (
        <div key={game.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">
              {game.icon} {game.name}
            </span>
            {game.buyIn > 0 && (
              <span className="text-xs text-gray-500">${game.buyIn}</span>
            )}
          </div>
          {game.results.length > 0 ? (
            <div className="space-y-1">
              {game.results
                .sort((a, b) => a.position - b.position)
                .slice(0, 5)
                .map(r => (
                  <div key={r.tripPlayerId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{r.name}</span>
                    <span className="font-medium text-gray-900">
                      {r.money !== 0 && (
                        <span className={r.money > 0 ? 'text-green-600' : 'text-red-600'}>
                          {r.money > 0 ? '+' : ''}${r.money.toFixed(0)}
                        </span>
                      )}
                      {r.money === 0 && r.points !== 0 && `${r.points} pts`}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Waiting for scores...</p>
          )}
        </div>
      ))}
    </div>
  )
}

function FeedTab({ feed }: { feed: ActivityFeedItem[] }) {
  if (feed.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
  }

  return (
    <div className="space-y-2">
      {feed.map(item => (
        <div key={item.id} className="flex gap-2 rounded-md px-2 py-1.5">
          <span className="flex-shrink-0 text-base">{item.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{item.title}</p>
            {item.detail && <p className="text-xs text-gray-500">{item.detail}</p>}
            <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(item.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}
