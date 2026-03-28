'use client'

import Link from 'next/link'
import type { FeedEventV2 } from '@/lib/v2/types'

interface FeedItemCardProps {
  item: FeedEventV2
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white shrink-0">
      {name[0]?.toUpperCase()}
    </div>
  )
}

function ScoreChip({
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  label: string
  value: string | number
  valueClass?: string
}) {
  return (
    <div className="rounded-lg bg-gray-100 px-2.5 py-1 text-center">
      <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold leading-tight ${valueClass}`}>{value}</p>
    </div>
  )
}

export default function FeedItemCard({ item }: FeedItemCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* Header: avatar + name + timestamp */}
      <div className="flex items-center gap-3 mb-2.5">
        <Link href={`/profile/${item.userId}`} className="shrink-0">
          <Avatar name={item.userName} url={item.userAvatarUrl} />
        </Link>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <Link
            href={`/profile/${item.userId}`}
            className="text-sm font-semibold text-gray-900 hover:text-golf-700 transition"
          >
            {item.userName.split(' ')[0]}
          </Link>
          <span className="text-xs text-gray-400 shrink-0">{relativeTime(item.timestamp)}</span>
        </div>
      </div>

      {/* Event rows — only render rows that exist */}
      <div className="space-y-2.5">
        {item.round && (() => {
          const { roundId, courseName, grossScore, netScore, par, tripName } = item.round
          const diff = grossScore - par
          const vsParStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
          const inner = (
            <>
              <span className="text-base leading-snug shrink-0">⛳</span>
              <div>
                <p className="text-sm text-gray-900">
                  Round at <span className="font-semibold">{courseName}</span>
                  {tripName && <span className="text-gray-500"> · {tripName}</span>}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <ScoreChip label="Gross" value={grossScore} />
                  {netScore != null && <ScoreChip label="Net" value={netScore} />}
                  <ScoreChip
                    label="vs Par"
                    value={vsParStr}
                    valueClass={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-700'}
                  />
                </div>
              </div>
            </>
          )
          return roundId ? (
            <Link href={`/scorecard/${roundId}`} className="flex items-start gap-2 hover:opacity-80 transition">
              {inner}
            </Link>
          ) : (
            <div className="flex items-start gap-2">{inner}</div>
          )
        })()}

        {item.match && (
          <div className="flex items-start gap-2">
            <span className="text-base leading-snug shrink-0">🏆</span>
            <p className="text-sm text-gray-900">
              <span className="font-semibold">{item.match.format}</span>
              <span className="text-gray-600"> — {item.match.result}</span>
            </p>
          </div>
        )}

        {item.earnings != null && (
          <div className="flex items-start gap-2">
            <span className="text-base leading-snug shrink-0">💰</span>
            <p className="text-sm">
              <span className={`font-bold ${item.earnings.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.earnings.net >= 0 ? '+' : ''}${Math.abs(item.earnings.net)}
              </span>
              <span className="text-gray-500"> on the day</span>
            </p>
          </div>
        )}
      </div>

      {/* Quick message */}
      <div className="mt-3 flex justify-end">
        <Link
          href={`/messages/${item.userId}`}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 hover:border-golf-400 hover:text-golf-700 transition"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Message
        </Link>
      </div>
    </div>
  )
}
