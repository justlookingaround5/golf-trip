'use client'

import Link from 'next/link'
import type { MatchV2 } from '@/lib/v2/types'

interface MatchCardProps {
  match: MatchV2
}

const FORMAT_LABELS: Record<string, string> = {
  '1v1_stroke':         '1v1 Stroke',
  '2v2_best_ball':      '2v2 Best Ball',
  '1v1_match':          '1v1 Match',
  '2v2_alternate_shot': '2v2 Alt Shot',
}

function StatusDot({ status }: { status: MatchV2['status'] }) {
  if (status === 'in_progress') return <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
  if (status === 'completed')   return <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
  return <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
}

export default function MatchCard({ match }: MatchCardProps) {
  const label = FORMAT_LABELS[match.format] ?? match.formatLabel
  const isLive = match.status === 'in_progress'
  const isDone = match.status === 'completed'

  return (
    <Link href={`/v2/match/${match.id}`}>
      <div className={`rounded-xl border bg-white shadow-sm active:bg-gray-50 transition cursor-pointer ${
        isLive ? 'border-yellow-300' : 'border-gray-200'
      }`}>
        {/* Header bar */}
        <div className={`flex items-center justify-between px-4 py-2 rounded-t-xl ${
          isLive ? 'bg-yellow-50' : isDone ? 'bg-gray-50' : 'bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <StatusDot status={match.status} />
            <span className="text-xs font-semibold text-gray-700">{match.courseName}</span>
          </div>
          <span className="text-xs text-gray-400">
            {match.teeTime && <>{match.teeTime} · </>}{label}
          </span>
        </div>

        {/* Teams + score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
          {/* Team A */}
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${
              isDone && match.teamA.points > match.teamB.points ? 'text-golf-700' : 'text-gray-900'
            }`}>
              {match.teamA.players.map(p => p.name).join(' & ')}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {match.teamA.name}
            </p>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 px-2">
            <span className={`text-lg font-black tabular-nums ${
              match.teamA.points > match.teamB.points ? 'text-golf-700' : 'text-gray-400'
            }`}>
              {match.teamA.points % 1 === 0 ? match.teamA.points : match.teamA.points.toFixed(1)}
            </span>
            <span className="text-xs text-gray-300">–</span>
            <span className={`text-lg font-black tabular-nums ${
              match.teamB.points > match.teamA.points ? 'text-golf-700' : 'text-gray-400'
            }`}>
              {match.teamB.points % 1 === 0 ? match.teamB.points : match.teamB.points.toFixed(1)}
            </span>
          </div>

          {/* Team B */}
          <div className="min-w-0 text-right">
            <p className={`text-sm font-semibold truncate ${
              isDone && match.teamB.points > match.teamA.points ? 'text-golf-700' : 'text-gray-900'
            }`}>
              {match.teamB.players.map(p => p.name).join(' & ')}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {match.teamB.name}
            </p>
          </div>
        </div>

        {/* Status label */}
        {(match.statusLabel || match.result) && (
          <div className="px-4 pb-3">
            <p className="text-center text-xs text-gray-500">
              {match.statusLabel ?? match.result}
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
