'use client'

interface TeamInfo {
  name: string
  color: string
  abbreviation: string
  players: string[]
  totalPoints: number
}

interface MatchWithNames {
  id: string
  session_id: string
  team_a_player_1_name: string
  team_a_player_2_name: string | null
  team_b_player_1_name: string
  team_b_player_2_name: string | null
  result: string | null
  winner: 'team_a' | 'team_b' | 'tie' | null
  points_team_a: number
  points_team_b: number
  match_order: number
  status: 'pending' | 'active' | 'completed'
}

interface SessionData {
  id: string
  name: string
  session_type: string
  session_order: number
  status: string
  matches: MatchWithNames[]
}

interface CompetitionClientProps {
  tripName: string
  competitionName: string
  status: string
  teamA: TeamInfo
  teamB: TeamInfo
  sessions: SessionData[]
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  foursomes: 'Foursomes (Alternate Shot)',
  four_ball: 'Four-Ball (Best Ball)',
  singles: 'Singles',
  custom: 'Custom',
}

export default function CompetitionClient({
  tripName,
  competitionName,
  status,
  teamA,
  teamB,
  sessions,
}: CompetitionClientProps) {
  const totalPoints = teamA.totalPoints + teamB.totalPoints
  const teamAPercent = totalPoints > 0 ? (teamA.totalPoints / totalPoints) * 100 : 50

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-golf-800 px-4 py-6 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">{tripName}</h1>
          <p className="mt-1 text-golf-200">{competitionName}</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Hero scoreboard */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="grid grid-cols-3">
            {/* Team A */}
            <div
              className="flex flex-col items-center justify-center px-4 py-6 text-white"
              style={{ backgroundColor: teamA.color }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {teamA.abbreviation}
              </span>
              <span className="mt-1 text-4xl font-black">
                {teamA.totalPoints % 1 === 0
                  ? teamA.totalPoints
                  : teamA.totalPoints.toFixed(1)}
              </span>
              <span className="mt-1 text-sm font-medium">{teamA.name}</span>
            </div>

            {/* Center */}
            <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 px-2 py-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                vs
              </span>
              <StatusBadge status={status} />
            </div>

            {/* Team B */}
            <div
              className="flex flex-col items-center justify-center px-4 py-6 text-white"
              style={{ backgroundColor: teamB.color }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {teamB.abbreviation}
              </span>
              <span className="mt-1 text-4xl font-black">
                {teamB.totalPoints % 1 === 0
                  ? teamB.totalPoints
                  : teamB.totalPoints.toFixed(1)}
              </span>
              <span className="mt-1 text-sm font-medium">{teamB.name}</span>
            </div>
          </div>

          {/* Progress bar */}
          {totalPoints > 0 && (
            <div className="flex h-2">
              <div
                className="transition-all duration-500"
                style={{ width: `${teamAPercent}%`, backgroundColor: teamA.color }}
              />
              <div
                className="transition-all duration-500"
                style={{
                  width: `${100 - teamAPercent}%`,
                  backgroundColor: teamB.color,
                }}
              />
            </div>
          )}
        </div>

        {/* Team rosters */}
        <div className="grid grid-cols-2 gap-3">
          <TeamRoster team={teamA} />
          <TeamRoster team={teamB} />
        </div>

        {/* Sessions */}
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            teamAColor={teamA.color}
            teamBColor={teamB.color}
            teamAAbbr={teamA.abbreviation}
            teamBAbbr={teamB.abbreviation}
          />
        ))}

        {sessions.length === 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center text-sm text-gray-500">
            No sessions scheduled yet.
          </div>
        )}
      </div>
    </div>
  )
}

function TeamRoster({ team }: { team: TeamInfo }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: team.color }}
        />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {team.name}
        </h4>
      </div>
      <ul className="space-y-1">
        {team.players.map((name, i) => (
          <li key={i} className="text-xs text-gray-600 dark:text-gray-400">
            {name}
          </li>
        ))}
        {team.players.length === 0 && (
          <li className="text-xs text-gray-400">No players assigned</li>
        )}
      </ul>
    </div>
  )
}

function SessionCard({
  session,
  teamAColor,
  teamBColor,
  teamAAbbr,
  teamBAbbr,
}: {
  session: SessionData
  teamAColor: string
  teamBColor: string
  teamAAbbr: string
  teamBAbbr: string
}) {
  // Sum session points
  let sessionTeamA = 0
  let sessionTeamB = 0
  for (const m of session.matches) {
    if (m.status === 'completed') {
      sessionTeamA += Number(m.points_team_a)
      sessionTeamB += Number(m.points_team_b)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Session header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {session.name}
          </h3>
          <p className="text-xs text-gray-500">
            {SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: teamAColor }}
          >
            {sessionTeamA % 1 === 0 ? sessionTeamA : sessionTeamA.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">-</span>
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: teamBColor }}
          >
            {sessionTeamB % 1 === 0 ? sessionTeamB : sessionTeamB.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Matches */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {session.matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            teamAAbbr={teamAAbbr}
            teamBAbbr={teamBAbbr}
          />
        ))}
        {session.matches.length === 0 && (
          <div className="p-4 text-center text-xs text-gray-400">
            No matches set up
          </div>
        )}
      </div>
    </div>
  )
}

function MatchRow({
  match,
  teamAColor,
  teamBColor,
  teamAAbbr,
  teamBAbbr,
}: {
  match: MatchWithNames
  teamAColor: string
  teamBColor: string
  teamAAbbr: string
  teamBAbbr: string
}) {
  const teamANames = match.team_a_player_2_name
    ? `${match.team_a_player_1_name} & ${match.team_a_player_2_name}`
    : match.team_a_player_1_name

  const teamBNames = match.team_b_player_2_name
    ? `${match.team_b_player_1_name} & ${match.team_b_player_2_name}`
    : match.team_b_player_1_name

  const isComplete = match.status === 'completed'
  const isActive = match.status === 'active'

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Team A side */}
      <div className="flex-1 text-right">
        <p
          className={`text-sm font-medium ${
            isComplete && match.winner === 'team_a'
              ? 'font-bold text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {teamANames}
        </p>
      </div>

      {/* Score / Status */}
      <div className="flex min-w-[80px] items-center justify-center gap-1">
        {isComplete || isActive ? (
          <>
            <span
              className="inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1 text-xs font-bold text-white"
              style={{ backgroundColor: teamAColor }}
            >
              {Number(match.points_team_a) % 1 === 0
                ? match.points_team_a
                : Number(match.points_team_a).toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">-</span>
            <span
              className="inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1 text-xs font-bold text-white"
              style={{ backgroundColor: teamBColor }}
            >
              {Number(match.points_team_b) % 1 === 0
                ? match.points_team_b
                : Number(match.points_team_b).toFixed(1)}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400">vs</span>
        )}
      </div>

      {/* Team B side */}
      <div className="flex-1">
        <p
          className={`text-sm font-medium ${
            isComplete && match.winner === 'team_b'
              ? 'font-bold text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {teamBNames}
        </p>
      </div>

      {/* Status dot */}
      <span
        className={`h-2 w-2 rounded-full ${
          isComplete
            ? 'bg-green-500'
            : isActive
              ? 'bg-yellow-400'
              : 'bg-gray-300'
        }`}
        title={match.status}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    setup: 'bg-gray-200 text-gray-700',
    active: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  }

  return (
    <span
      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        colors[status] ?? 'bg-gray-200 text-gray-700'
      }`}
    >
      {status}
    </span>
  )
}
