// HOME TAB
// Sections (top → bottom):
//   1. Team Scores widget
//   2. Active Round card
//   3. Friends Playing Now
//   4. Recent Activity — completed friend rounds with score, match result, earnings

import Link from 'next/link'
import TeamScoresCard from '@/components/v2/TeamScoresCard'
import RelativeTime from '@/components/RelativeTime'
import RecentActivityFeed from '@/components/v2/RecentActivityFeed'
import { getHomePageData, type FriendMatchGroup, type FriendActiveRound } from '@/lib/v2/home-data'

// ─── Friend Match Card ────────────────────────────────────────────────────────

function diffStr(d: number | null) {
  if (d == null) return null
  return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`
}

function FriendMatchCard({ group }: { group: FriendMatchGroup }) {
  const aWins = group.leader === 'team_a'
  const bWins = group.leader === 'team_b'
  const isTied = group.resultLabel === 'AS' || group.leader === 'tie'
  const resultBadge = group.resultLabel && !isTied ? group.resultLabel : null

  return (
    <Link
      href={`/scorecard/${group.courseId}?userId=${group.friendUserId}`}
      className="block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-medium text-gray-500">
          {group.courseName} <span className="mx-2">·</span> {group.formatLabel}
        </p>
      </div>
      <div className="flex">
        {/* Team A panel */}
        <div
          className="flex-1 px-3 py-2.5 flex flex-col justify-center relative"
          style={{ backgroundColor: aWins ? 'rgba(22, 163, 74, 0.12)' : undefined }}
        >
          {group.teamA.map((p, i) => (
            <span key={i} className={`text-xs leading-5 ${aWins ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
              {p.name}
              {diffStr(p.scoreDiff) != null && (
                <span className="text-[10px] text-gray-400 ml-1">({diffStr(p.scoreDiff)})</span>
              )}
            </span>
          ))}
          {aWins && resultBadge && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-black text-gray-900">{resultBadge}</span>
          )}
        </div>
        {/* Center divider */}
        <div className="flex flex-col items-center justify-center px-1.5 py-2 bg-white min-w-[48px]">
          {isTied && (
            <span className="text-[10px] font-bold text-gray-400">AS</span>
          )}
          <span className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wider">Thru {group.holesPlayed}</span>
        </div>
        {/* Team B panel */}
        <div
          className="flex-1 px-3 py-2.5 flex flex-col justify-center items-end text-right relative"
          style={{ backgroundColor: bWins ? 'rgba(22, 163, 74, 0.12)' : undefined }}
        >
          {group.teamB.map((p, i) => (
            <span key={i} className={`text-xs leading-5 ${bWins ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
              {diffStr(p.scoreDiff) != null && (
                <span className="text-[10px] text-gray-400 mr-1">({diffStr(p.scoreDiff)})</span>
              )}
              {p.name}
            </span>
          ))}
          {bWins && resultBadge && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-black text-gray-900">{resultBadge}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Active Round Card ─────────────────────────────────────────────────────────

function ActiveRoundCard({ r }: { r: { courseId: string; courseName: string; tripId: string; tripName: string; holesPlayed: number; par: number; matchId: string | null; teamANames: string[]; teamBNames: string[]; formatLabel: string | null } }) {
  const href = `/trip/${r.tripId}/live/${r.courseId}`
  const hasMatch = r.teamANames.length > 0 && r.teamBNames.length > 0
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl bg-green-600 py-7 text-white shadow-lg active:bg-green-700 transition"
    >
      <span className="text-4xl">&#9971;</span>
      <span className="text-xl font-bold">Continue Round</span>
      <span className="text-sm font-medium text-green-50">{r.courseName}</span>
      <div className="flex items-center gap-3 mt-1 text-xs text-green-200">
        <span>{r.holesPlayed} holes played</span>
        {r.formatLabel && (
          <>
            <span>·</span>
            <span>{r.formatLabel}</span>
          </>
        )}
      </div>
    </Link>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const { trip, teams, matches, activeRound, friendMatchGroups, friendActiveRounds, friendRounds, currentUserId } = await getHomePageData()

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-900 px-4 pt-14 pb-6 text-center">
        <div className="text-3xl font-bold tracking-tight">
          <span className="text-gold">Fore</span>
          <span className="text-white">Live</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">

        {/* 1 · Team Scores */}
        {trip && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">Active Trip</h2>
            <TeamScoresCard
              matches={matches}
              tripId={trip.id}
              tripName={trip.name}
              teams={teams}
              linkToFull
            />
          </div>
        )}

        {/* 2 · Active Round */}
        {activeRound && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">Active Round</h2>
            <ActiveRoundCard r={activeRound} />
          </div>
        )}

        {/* 3 · Friends Playing Now */}
        {(friendMatchGroups.length > 0 || friendActiveRounds.length > 0) && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">Friends Playing Now</h2>
            <div className="space-y-2">
              {(
                [
                  ...friendMatchGroups.map(g => ({ type: 'match' as const, holesPlayed: g.holesPlayed, data: g })),
                  ...friendActiveRounds.map(r => ({ type: 'individual' as const, holesPlayed: r.holesPlayed, data: r })),
                ].sort((a, b) => b.holesPlayed - a.holesPlayed)
              ).map(item =>
                item.type === 'match' ? (
                  <FriendMatchCard key={(item.data as FriendMatchGroup).matchId} group={item.data as FriendMatchGroup} />
                ) : (() => {
                  const fr = item.data as FriendActiveRound
                  const diff = fr.currentGross - fr.par
                  const vsParStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
                  return (
                    <Link
                      key={fr.userId}
                      href={`/scorecard/${fr.roundId}?userId=${fr.userId}`}
                      className="block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    >
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm font-medium text-gray-500">
                          {fr.courseName}
                        </p>
                      </div>
                      <div className="flex">
                        <div className="flex-1 px-3 py-2.5 flex flex-col justify-center">
                          <span className="text-xs leading-5 font-medium text-gray-600">
                            {fr.userName.split(' ')[0]}
                            <span className="text-[10px] text-gray-400 ml-1">({vsParStr})</span>
                          </span>
                        </div>
                        <div className="flex flex-col items-center justify-center px-1.5 py-2 bg-white min-w-[48px]">
                          <span className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wider">Thru {fr.holesPlayed}</span>
                        </div>
                        <div className="flex-1 px-3 py-2.5" />
                      </div>
                    </Link>
                  )
                })()
              )}
            </div>
          </div>
        )}

        {/* 4 · Recent Activity */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">Recent Activity</h2>
          {friendRounds.length > 0 ? (
            <RecentActivityFeed items={friendRounds} currentUserId={currentUserId} />
          ) : (
            <p className="text-sm text-gray-400">Finished friend rounds will appear here</p>
          )}
        </div>

      </div>
    </div>
  )
}
