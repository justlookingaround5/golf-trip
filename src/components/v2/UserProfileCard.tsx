'use client'

// Reusable card used in:
//   - Home: Friend Active Rounds
//   - Home: Feed items
//   - Profile > Friends list

import Link from 'next/link'
import type { PlayerV2 } from '@/lib/v2/types'

interface UserProfileCardProps {
  player: PlayerV2
  /** Optional sub-label (e.g. "Playing Spyglass Hill · 14 holes") */
  subLabel?: string
  /** Optional right-side badge or score chip */
  badge?: React.ReactNode
  /** If provided, a quick message button appears */
  onMessage?: () => void
  /** Base href for tapping the card — defaults to /v2/profile/[id] */
  href?: string
}

function Avatar({ player }: { player: PlayerV2 }) {
  if (player.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.avatarUrl}
        alt={player.name}
        className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
      />
    )
  }
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-golf-600 text-base font-bold text-white ring-2 ring-white">
      {player.name[0]?.toUpperCase()}
    </div>
  )
}

export default function UserProfileCard({
  player,
  subLabel,
  badge,
  onMessage,
  href,
}: UserProfileCardProps) {
  const dest = href ?? `/v2/profile/${player.id}`

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <Link href={dest} className="shrink-0">
        <Avatar player={player} />
      </Link>

      <Link href={dest} className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{player.name}</p>
        {subLabel && <p className="text-xs text-gray-500 truncate mt-0.5">{subLabel}</p>}
      </Link>

      {badge && <div className="shrink-0">{badge}</div>}

      {onMessage && (
        <button
          onClick={onMessage}
          aria-label={`Message ${player.name}`}
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-golf-400 hover:text-golf-700 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </div>
  )
}
