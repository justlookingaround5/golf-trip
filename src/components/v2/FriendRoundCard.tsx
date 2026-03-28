'use client'

import { useState } from 'react'
import Link from 'next/link'
import RelativeTime from '@/components/RelativeTime'
import RoundReactions from '@/components/v2/RoundReactions'
import CommentSheet from '@/components/CommentSheet'
import type { FriendRoundFeedItem } from '@/lib/v2/home-data'

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover" />
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-bold text-white">
      {name[0]?.toUpperCase()}
    </div>
  )
}

interface FriendRoundCardProps {
  item: FriendRoundFeedItem
  currentUserId: string | null
}

export default function FriendRoundCard({ item, currentUserId }: FriendRoundCardProps) {
  const [commentSheetOpen, setCommentSheetOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(item.commentCount)

  const vsPar = item.grossScore - item.par

  const earningsColor =
    (item.netEarnings ?? 0) > 0 ? 'text-green-600' :
    (item.netEarnings ?? 0) < 0 ? 'text-red-500'   :
    'text-gray-500'

  const earningsStr = item.netEarnings !== null
    ? item.netEarnings > 0  ? `+$${item.netEarnings}`
    : item.netEarnings < 0  ? `-$${Math.abs(item.netEarnings)}`
    : '$0'
    : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
      {/* Header: avatar, name, course, time */}
      <div className="flex items-center gap-2.5 mb-2">
        <Link href={`/profile/${item.userId}`} className="shrink-0">
          <Avatar name={item.playerName} avatarUrl={item.playerAvatarUrl} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/profile/${item.userId}`}
              className="font-semibold text-gray-900 text-sm hover:text-golf-700 transition"
            >
              {item.playerName.split(' ')[0]}
            </Link>
            {item.matchResult && (
              <span className="font-semibold text-gray-900 text-sm">{item.matchResult.toLowerCase().replace(/up/g, 'UP').replace(/dn/g, 'DN')}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 leading-tight truncate">
            {item.courseName}{item.matchFormatLabel && <span className="mx-2">·</span>}{item.matchFormatLabel}
          </p>
        </div>
        <span className="text-[11px] text-gray-400 shrink-0"><RelativeTime date={item.completedAt} /></span>
      </div>

      {/* Detail rows + earnings badge */}
      <Link href={`/scorecard/${item.courseId}?userId=${item.userId}`} className="block mb-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-0.5 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center rounded-lg bg-gray-100 px-3 py-1.5 w-24 h-14">
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Gross</span>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-gray-900 tabular-nums">{item.grossScore}</span>
                  <span className={`text-sm font-semibold tabular-nums ${vsPar > 0 ? 'text-blue-500' : vsPar < 0 ? 'text-red-500' : 'text-gray-500'}`}>({vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : vsPar})</span>
                </div>
              </div>
              {item.netScore !== null && (() => {
                const vsParNet = item.netScore - item.par
                return (
                  <div className="flex flex-col items-center justify-center rounded-lg bg-gray-100 px-3 py-1.5 w-24 h-14">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Net</span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-gray-900 tabular-nums">{item.netScore}</span>
                      <span className={`text-sm font-semibold tabular-nums ${vsParNet > 0 ? 'text-blue-500' : vsParNet < 0 ? 'text-red-500' : 'text-gray-500'}`}>({vsParNet === 0 ? 'E' : vsParNet > 0 ? `+${vsParNet}` : vsParNet})</span>
                    </div>
                  </div>
                )
              })()}
              {earningsStr && (
                <div className={`flex flex-col items-center justify-center rounded-lg px-3 py-1.5 w-24 h-14 ${
                  (item.netEarnings ?? 0) > 0 ? 'bg-green-50' :
                  (item.netEarnings ?? 0) < 0 ? 'bg-red-50' :
                  'bg-gray-100'
                }`}>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Earnings</span>
                  <span className={`text-lg font-bold tabular-nums ${earningsColor}`}>{earningsStr}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Reactions + Comment button row */}
      <div className="flex items-center justify-between">
        <RoundReactions
          roundKey={item.key}
          currentUserId={currentUserId}
          initialReactions={item.reactions}
        />
        <button
          onClick={() => setCommentSheetOpen(true)}
          className="flex items-center gap-1 group shrink-0 ml-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
          </svg>
          <span className="text-xs text-gray-500 tabular-nums">{commentCount}</span>
        </button>
      </div>

      {/* Comment bottom sheet */}
      {commentSheetOpen && (
        <CommentSheet
          roundKey={item.key}
          currentUserId={currentUserId}
          onClose={() => setCommentSheetOpen(false)}
        />
      )}
    </div>
  )
}
