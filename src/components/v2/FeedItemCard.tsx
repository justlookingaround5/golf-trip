'use client'

import Link from 'next/link'
import type { FeedItemV2 } from '@/lib/v2/types'

interface FeedItemCardProps {
  item: FeedItemV2
  onMessage?: (userId: string) => void
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
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golf-600 text-sm font-bold text-white">
      {name[0]?.toUpperCase()}
    </div>
  )
}

function RoundBody({ item }: { item: FeedItemV2 }) {
  const vsPar = item.grossScore != null && item.par != null ? item.grossScore - item.par : null
  const vsParStr = vsPar == null ? null : vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`
  return (
    <div>
      <p className="text-sm text-gray-900">
        Posted a round at <span className="font-semibold">{item.courseName}</span>
        {item.tripName && <span className="text-gray-500"> · {item.tripName}</span>}
      </p>
      {item.grossScore != null && (
        <div className="mt-1.5 flex items-center gap-3">
          <ScoreChip label="Gross" value={item.grossScore} />
          {item.netScore != null && <ScoreChip label="Net" value={item.netScore} />}
          {vsParStr && (
            <ScoreChip
              label="vs Par"
              value={vsParStr}
              valueClass={vsPar! < 0 ? 'text-red-600' : vsPar! > 0 ? 'text-blue-600' : 'text-gray-700'}
            />
          )}
        </div>
      )}
    </div>
  )
}

function MatchBody({ item }: { item: FeedItemV2 }) {
  return (
    <p className="text-sm text-gray-900">
      <span className="font-semibold">{item.matchFormat}</span>
      {item.matchResult && <span className="text-gray-600"> — {item.matchResult}</span>}
    </p>
  )
}

function EarningsBody({ item }: { item: FeedItemV2 }) {
  const pos = (item.amount ?? 0) >= 0
  return (
    <p className="text-sm text-gray-900">
      {item.earningsSource && <span className="text-gray-500">{item.earningsSource} · </span>}
      <span className={`font-bold ${pos ? 'text-green-600' : 'text-red-600'}`}>
        {pos ? '+' : ''}${Math.abs(item.amount ?? 0)}
      </span>
    </p>
  )
}

function SkinBody({ item }: { item: FeedItemV2 }) {
  return (
    <p className="text-sm text-gray-900">
      Won a skin on <span className="font-semibold">Hole {item.holeNumber}</span>
      {item.courseName && <span className="text-gray-500"> · {item.courseName}</span>}
    </p>
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

const TYPE_ICON: Record<FeedItemV2['type'], string> = {
  round:    '⛳',
  match:    '🏆',
  earnings: '💰',
  skin:     '🎯',
}

export default function FeedItemCard({ item, onMessage }: FeedItemCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link href={`/v2/profile/${item.userId}`} className="shrink-0 mt-0.5">
          <Avatar name={item.userName} url={item.userAvatarUrl} />
        </Link>

        <div className="flex-1 min-w-0">
          {/* Name + time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <Link
              href={`/v2/profile/${item.userId}`}
              className="text-sm font-semibold text-gray-900 hover:text-golf-700 transition"
            >
              {item.userName}
            </Link>
            <span className="text-xs text-gray-400 shrink-0">{relativeTime(item.timestamp)}</span>
          </div>

          {/* Type icon + body */}
          <div className="flex items-start gap-2">
            <span className="text-base leading-snug">{TYPE_ICON[item.type]}</span>
            <div className="flex-1 min-w-0">
              {item.type === 'round'    && <RoundBody    item={item} />}
              {item.type === 'match'    && <MatchBody    item={item} />}
              {item.type === 'earnings' && <EarningsBody item={item} />}
              {item.type === 'skin'     && <SkinBody     item={item} />}
            </div>
          </div>
        </div>
      </div>

      {/* Quick message */}
      {onMessage && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => onMessage(item.userId)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 hover:border-golf-400 hover:text-golf-700 transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Message
          </button>
        </div>
      )}
    </div>
  )
}
