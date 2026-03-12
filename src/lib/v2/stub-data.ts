// ─────────────────────────────────────────────────────────────────────────────
// STUB DATA — replace each export with real Supabase queries when ready
// ─────────────────────────────────────────────────────────────────────────────
import type {
  PlayerV2,
  MatchV2,
  TripV2,
  RoundV2,
  FeedEventV2,
  PlayerLeaderboardStats,
  HoleLeaderboardStats,
  PlayerEarnings,
  CoursePinV2,
  MessageThread,
  ChatMessageV2,
  ScorecardV2,
  TripRoundV2,
  SkinResultV2,
  TripRoundScoreV2,
  TripEarningsRow,
} from './types'

// ─── Players ──────────────────────────────────────────────────────────────────

export const ME: PlayerV2 = { id: 'p1', name: 'Andrew', avatarUrl: null, handicap: 8 }

export const STUB_PLAYERS: PlayerV2[] = [
  ME,
  { id: 'p2', name: 'Jake',  avatarUrl: null, handicap: 12 },
  { id: 'p3', name: 'Mike',  avatarUrl: null, handicap: 5  },
  { id: 'p4', name: 'Tom',   avatarUrl: null, handicap: 18 },
]

// ─── Active Trip ──────────────────────────────────────────────────────────────

export const ACTIVE_TRIP: TripV2 = {
  id: 'trip1',
  name: 'Pebble Beach 2025',
  location: 'Pebble Beach, CA',
  startDate: '2025-06-10',
  endDate: '2025-06-14',
  status: 'active',
  playerCount: 4,
  players: STUB_PLAYERS,
}

// ─── Active Round (viewer's in-progress round today) ──────────────────────────

export const ACTIVE_ROUND: RoundV2 = {
  id: 'round1',
  courseId: 'course2',
  courseName: 'Spyglass Hill',
  date: '2025-06-12',
  tripId: 'trip1',
  tripName: 'Pebble Beach 2025',
  isQuickRound: false,
  grossTotal: null,  // in progress
  netTotal: null,
  par: 72,
  holesPlayed: 9,
  latitude: 36.5833,
  longitude: -121.9672,
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export const STUB_MATCHES: MatchV2[] = [
  {
    id: 'm1',
    roundNumber: 2,
    format: '2v2_best_ball',
    formatLabel: '2v2 Best Ball',
    status: 'in_progress',
    teamA: { name: 'Team Tall', players: [STUB_PLAYERS[0], STUB_PLAYERS[1]], points: 2.5 },
    teamB: { name: 'Team Short', players: [STUB_PLAYERS[2], STUB_PLAYERS[3]], points: 1.5 },
    result: null,
    statusLabel: 'Team Tall lead 2.5–1.5 thru 9',
    courseId: 'course2',
    courseName: 'Spyglass Hill',
    tripId: 'trip1',
  },
  {
    id: 'm2',
    roundNumber: 1,
    format: '1v1_match',
    formatLabel: '1v1 Match Play',
    status: 'completed',
    teamA: { name: 'Team Tall', players: [STUB_PLAYERS[0]], points: 1 },
    teamB: { name: 'Team Short', players: [STUB_PLAYERS[2]], points: 0 },
    result: 'Andrew wins 3&2',
    statusLabel: null,
    courseId: 'course1',
    courseName: 'Pebble Beach Golf Links',
    tripId: 'trip1',
  },
  {
    id: 'm3',
    roundNumber: 1,
    format: '1v1_stroke',
    formatLabel: '1v1 Stroke Play',
    status: 'completed',
    teamA: { name: 'Team Short', players: [STUB_PLAYERS[3]], points: 1 },
    teamB: { name: 'Team Tall', players: [STUB_PLAYERS[1]], points: 0 },
    result: 'Tom wins by 2',
    statusLabel: null,
    courseId: 'course1',
    courseName: 'Pebble Beach Golf Links',
    tripId: 'trip1',
  },
]

// ─── Player Leaderboard Stats ─────────────────────────────────────────────────

export const STUB_PLAYER_STATS: PlayerLeaderboardStats[] = [
  {
    player: STUB_PLAYERS[0],
    matchRecord: { wins: 2, losses: 0, ties: 1 },
    points: 3.5,
    grossAvg: 78.5,
    netAvg: 70.5,
    skinsWon: 3,
    fairwayPct: 61,
    girPct: 44,
    puttsAvg: 31.5,
  },
  {
    player: STUB_PLAYERS[2],
    matchRecord: { wins: 1, losses: 1, ties: 1 },
    points: 2.5,
    grossAvg: 74.0,
    netAvg: 69.0,
    skinsWon: 4,
    fairwayPct: 72,
    girPct: 56,
    puttsAvg: 29.0,
  },
  {
    player: STUB_PLAYERS[1],
    matchRecord: { wins: 1, losses: 1, ties: 1 },
    points: 2.5,
    grossAvg: 82.0,
    netAvg: 70.0,
    skinsWon: 1,
    fairwayPct: 55,
    girPct: 38,
    puttsAvg: 33.0,
  },
  {
    player: STUB_PLAYERS[3],
    matchRecord: { wins: 1, losses: 2, ties: 0 },
    points: 1.5,
    grossAvg: 90.5,
    netAvg: 72.5,
    skinsWon: 2,
    fairwayPct: 44,
    girPct: 28,
    puttsAvg: 35.0,
  },
]

// ─── Hole Leaderboard Stats ───────────────────────────────────────────────────

export const STUB_HOLE_STATS: HoleLeaderboardStats[] = Array.from({ length: 18 }, (_, i) => {
  const hole = i + 1
  const par = [4, 5, 3, 4, 3, 4, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5][i]
  return {
    holeNumber: hole,
    par,
    avgGross: par + (Math.random() * 1.4).toFixed(1) as unknown as number,
    avgNet: par + (Math.random() * 0.8).toFixed(1) as unknown as number,
    birdiesOrBetter: Math.floor(Math.random() * 3),
    pars: Math.floor(Math.random() * 5) + 1,
    bogeysOrWorse: Math.floor(Math.random() * 4) + 1,
    fairwayPct: par === 3 ? null : Math.floor(Math.random() * 40) + 40,
    girPct: Math.floor(Math.random() * 40) + 20,
    avgPutts: 1.8 + Math.random() * 0.8,
  }
})

// ─── Earnings ─────────────────────────────────────────────────────────────────

export const STUB_EARNINGS: PlayerEarnings[] = [
  {
    player: STUB_PLAYERS[0],
    netEarnings: 54,
    breakdown: [
      { label: 'Match results', amount: 30 },
      { label: 'Skins', amount: 24 },
    ],
  },
  {
    player: STUB_PLAYERS[2],
    netEarnings: 22,
    breakdown: [
      { label: 'Match results', amount: -10 },
      { label: 'Skins', amount: 32 },
    ],
  },
  {
    player: STUB_PLAYERS[1],
    netEarnings: -2,
    breakdown: [
      { label: 'Match results', amount: -10 },
      { label: 'Skins', amount: 8 },
    ],
  },
  {
    player: STUB_PLAYERS[3],
    netEarnings: -26,
    breakdown: [
      { label: 'Match results', amount: -10 },
      { label: 'Skins', amount: -16 },
    ],
  },
]

// ─── Trip Rounds ──────────────────────────────────────────────────────────────

export const STUB_TRIP_ROUNDS: TripRoundV2[] = [
  { roundNumber: 1, courseId: 'course1', courseName: 'Pebble Beach Golf Links', par: 72 },
  { roundNumber: 2, courseId: 'course2', courseName: 'Spyglass Hill', par: 72 },
]

// ─── Per-Round Scores (for Individual Leaderboard) ────────────────────────────

export const STUB_ROUND_SCORES: TripRoundScoreV2[] = [
  { playerId: 'p1', roundNumber: 1, grossScore: 78, netScore: 70, par: 72 },
  { playerId: 'p2', roundNumber: 1, grossScore: 85, netScore: 73, par: 72 },
  { playerId: 'p3', roundNumber: 1, grossScore: 74, netScore: 69, par: 72 },
  { playerId: 'p4', roundNumber: 1, grossScore: 93, netScore: 75, par: 72 },
  { playerId: 'p1', roundNumber: 2, grossScore: 82, netScore: 74, par: 72 },
  { playerId: 'p2', roundNumber: 2, grossScore: 89, netScore: 77, par: 72 },
  { playerId: 'p3', roundNumber: 2, grossScore: 77, netScore: 72, par: 72 },
  { playerId: 'p4', roundNumber: 2, grossScore: null, netScore: null, par: 72 },
]

// ─── Hole Stats by Round (deterministic) ─────────────────────────────────────

const _PARS18 = [4, 5, 3, 4, 3, 4, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5]
const _GROSS_OFFSETS = [1.2, 0.8, 1.5, 1.0, 0.9, 1.3, 1.1, 0.7, 1.4, 1.0, 0.8, 1.2, 0.9, 1.1, 1.3, 0.6, 1.4, 1.2]
const _NET_OFFSETS   = [0.5, 0.2, 0.8, 0.4, 0.3, 0.6, 0.5, 0.2, 0.7, 0.4, 0.3, 0.6, 0.3, 0.5, 0.7, 0.1, 0.6, 0.5]
const _BIRDIES  = [0, 2, 0, 1, 1, 0, 1, 2, 1, 1, 0, 0, 2, 1, 0, 2, 0, 1]
const _PARS_CNT = [3, 2, 1, 3, 2, 2, 3, 3, 2, 3, 2, 2, 2, 3, 2, 2, 2, 2]
const _BOGEYS   = [4, 0, 3, 0, 1, 2, 0, 0, 1, 0, 2, 2, 0, 0, 2, 0, 2, 1]
const _FW_PCTS  = [61, 72, null, 55, null, 67, 50, 72, 58, 63, null, 55, 67, 61, 72, null, 58, 64]
const _GIR_PCTS = [44, 56, 33, 50, 42, 47, 39, 58, 44, 50, 36, 42, 53, 47, 44, 61, 42, 50]
const _PUTTS    = [1.9, 1.8, 2.1, 1.8, 2.0, 1.9, 1.8, 1.7, 2.0, 1.8, 2.1, 1.9, 1.8, 1.9, 2.0, 1.7, 1.9, 2.0]

function _makeHoleStats(rdOffset: number): import('./types').HoleLeaderboardStats[] {
  return _PARS18.map((par, i) => ({
    holeNumber: i + 1,
    par,
    avgGross: parseFloat((par + _GROSS_OFFSETS[i] + rdOffset * 0.1).toFixed(1)),
    avgNet:   parseFloat((par + _NET_OFFSETS[i]).toFixed(1)),
    birdiesOrBetter: _BIRDIES[i],
    pars:            _PARS_CNT[i],
    bogeysOrWorse:   _BOGEYS[i],
    fairwayPct: _FW_PCTS[i] as number | null,
    girPct:     _GIR_PCTS[i],
    avgPutts:   _PUTTS[i],
  }))
}

export const STUB_HOLE_STATS_BY_ROUND: Record<number, import('./types').HoleLeaderboardStats[]> = {
  1: _makeHoleStats(0),
  2: _makeHoleStats(1),
}

// ─── Skins by Round ───────────────────────────────────────────────────────────

export const STUB_SKINS_BY_ROUND: Record<number, import('./types').SkinResultV2[]> = {
  1: [
    { holeNumber:  1, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  2, par: 5, winnerId: 'p3',  winnerName: 'Mike',   grossScore: 4,    netScore: 3    },
    { holeNumber:  3, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  4, par: 4, winnerId: 'p1',  winnerName: 'Andrew', grossScore: 4,    netScore: 3    },
    { holeNumber:  5, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  6, par: 4, winnerId: 'p3',  winnerName: 'Mike',   grossScore: 4,    netScore: 4    },
    { holeNumber:  7, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  8, par: 4, winnerId: 'p1',  winnerName: 'Andrew', grossScore: 3,    netScore: 2    },
    { holeNumber:  9, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 10, par: 4, winnerId: 'p2',  winnerName: 'Jake',   grossScore: 3,    netScore: 2    },
    { holeNumber: 11, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 12, par: 4, winnerId: 'p3',  winnerName: 'Mike',   grossScore: 4,    netScore: 3    },
    { holeNumber: 13, par: 5, winnerId: 'p1',  winnerName: 'Andrew', grossScore: 3,    netScore: 3    },
    { holeNumber: 14, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 15, par: 4, winnerId: 'p4',  winnerName: 'Tom',    grossScore: 4,    netScore: 3    },
    { holeNumber: 16, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 17, par: 4, winnerId: 'p3',  winnerName: 'Mike',   grossScore: 4,    netScore: 3    },
    { holeNumber: 18, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
  ],
  2: [
    { holeNumber:  1, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  2, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  3, par: 3, winnerId: 'p3',  winnerName: 'Mike',   grossScore: 3,    netScore: 2    },
    { holeNumber:  4, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  5, par: 3, winnerId: 'p1',  winnerName: 'Andrew', grossScore: 2,    netScore: 2    },
    { holeNumber:  6, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  7, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  8, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  9, par: 5, winnerId: 'p4',  winnerName: 'Tom',    grossScore: 5,    netScore: 3    },
    { holeNumber: 10, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 11, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 12, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 13, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 14, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 15, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 16, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 17, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 18, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
  ],
}

// ─── Trip Earnings (structured columns) ──────────────────────────────────────
// Team: team game result (+/- from overall team win/loss)
// Matches: individual head-to-head match earnings
// Skins: skin game earnings (10 skins × $8 each, $20 buy-in per player)
// NetTotal: sum of all three

export const STUB_TRIP_EARNINGS: TripEarningsRow[] = [
  { player: STUB_PLAYERS[0], team:  15, matches:  20, skins:   4, netTotal:  39 },
  { player: STUB_PLAYERS[1], team:  15, matches: -10, skins: -12, netTotal:  -7 },
  { player: STUB_PLAYERS[2], team: -15, matches: -20, skins:  12, netTotal: -23 },
  { player: STUB_PLAYERS[3], team: -15, matches:  10, skins:  -4, netTotal:  -9 },
]

// ─── Scorecard ────────────────────────────────────────────────────────────────

const HOLE_PARS = [4, 5, 3, 4, 3, 4, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5]
const HOLE_HCP  = [7, 15, 11, 3, 17, 1, 13, 5, 9, 8, 16, 12, 4, 2, 10, 18, 6, 14]

function makeHoles(grossScores: number[]): import('./types').HoleScoreV2[] {
  return grossScores.map((gross, i) => ({
    holeId: `h${i + 1}`,
    holeNumber: i + 1,
    par: HOLE_PARS[i],
    handicapIndex: HOLE_HCP[i],
    gross,
    net: gross - (HOLE_HCP[i] <= 8 ? 1 : 0),
    fairwayHit: HOLE_PARS[i] === 3 ? null : Math.random() > 0.45,
    gir: Math.random() > 0.55,
    putts: Math.floor(Math.random() * 2) + 1,
  }))
}

export const STUB_SCORECARD: ScorecardV2 = {
  courseId: 'course1',
  courseName: 'Pebble Beach Golf Links',
  date: '2025-06-11',
  par: 72,
  roundNumber: 1,
  players: [
    { player: STUB_PLAYERS[0], holes: makeHoles([4,5,4,4,3,5,4,5,5, 4,3,4,5,4,5,3,4,5]), grossTotal: 78, netTotal: 70 },
    { player: STUB_PLAYERS[1], holes: makeHoles([5,6,4,5,4,5,5,5,6, 5,4,5,6,5,5,4,5,6]), grossTotal: 85, netTotal: 73 },
    { player: STUB_PLAYERS[2], holes: makeHoles([4,4,3,4,3,4,4,4,5, 4,3,4,4,4,4,3,4,5]), grossTotal: 74, netTotal: 69 },
    { player: STUB_PLAYERS[3], holes: makeHoles([5,6,5,5,4,6,5,6,6, 5,4,5,6,5,6,4,5,6]), grossTotal: 93, netTotal: 75 },
  ],
}

// ─── Course Pins (for profile map) ───────────────────────────────────────────

export const STUB_PINS: CoursePinV2[] = [
  {
    courseId: 'course1',
    courseName: 'Pebble Beach Golf Links',
    date: '2025-06-11',
    grossScore: 78,
    netScore: 70,
    par: 72,
    tripName: 'Pebble Beach 2025',
    rating: 9.8,
    latitude: 36.5677,
    longitude: -121.9500,
  },
  {
    courseId: 'course3',
    courseName: 'Augusta National',
    date: '2024-04-10',
    grossScore: 81,
    netScore: 73,
    par: 72,
    tripName: 'Masters Trip 2024',
    rating: 9.4,
    latitude: 33.5021,
    longitude: -82.0232,
  },
  {
    courseId: 'course4',
    courseName: 'Pinehurst No. 2',
    date: '2024-07-15',
    grossScore: 80,
    netScore: 72,
    par: 70,
    tripName: 'Pinehurst 2024',
    rating: 8.6,
    latitude: 35.1954,
    longitude: -79.4699,
  },
  {
    courseId: 'course5',
    courseName: 'Whistling Straits',
    date: '2023-08-22',
    grossScore: 84,
    netScore: 76,
    par: 72,
    tripName: 'Kohler Trip 2023',
    rating: 8.2,
    latitude: 43.8567,
    longitude: -87.7245,
  },
]

// ─── All Logged Rounds (for Stats tab) ───────────────────────────────────────

export const STUB_ALL_ROUNDS: RoundV2[] = [
  {
    id: 'r1', courseId: 'course1', courseName: 'Pebble Beach Golf Links',
    date: '2025-06-11', tripId: 'trip1', tripName: 'Pebble Beach 2025',
    isQuickRound: false, grossTotal: 78, netTotal: 70, par: 72, holesPlayed: 18,
    latitude: 36.5677, longitude: -121.9500,
  },
  {
    id: 'r2', courseId: 'course3', courseName: 'Augusta National',
    date: '2024-04-10', tripId: 'trip2', tripName: 'Masters Trip 2024',
    isQuickRound: false, grossTotal: 81, netTotal: 73, par: 72, holesPlayed: 18,
    latitude: 33.5021, longitude: -82.0232,
  },
  {
    id: 'r3', courseId: 'course4', courseName: 'Pinehurst No. 2',
    date: '2024-07-15', tripId: 'trip3', tripName: 'Pinehurst 2024',
    isQuickRound: false, grossTotal: 80, netTotal: 72, par: 70, holesPlayed: 18,
    latitude: 35.1954, longitude: -79.4699,
  },
  {
    id: 'r4', courseId: 'course6', courseName: 'Torrey Pines (South)',
    date: '2024-02-03', tripId: null, tripName: null,
    isQuickRound: true, grossTotal: 82, netTotal: 74, par: 72, holesPlayed: 18,
    latitude: 32.8998, longitude: -117.2498,
  },
  {
    id: 'r5', courseId: 'course5', courseName: 'Whistling Straits',
    date: '2023-08-22', tripId: 'trip4', tripName: 'Kohler Trip 2023',
    isQuickRound: false, grossTotal: 84, netTotal: 76, par: 72, holesPlayed: 18,
    latitude: 43.8567, longitude: -87.7245,
  },
]

// ─── Past Trips (for Profile > My Trips) ─────────────────────────────────────

export const STUB_PAST_TRIPS: TripV2[] = [
  {
    id: 'trip2', name: 'Masters Trip 2024', location: 'Augusta, GA',
    startDate: '2024-04-08', endDate: '2024-04-12',
    status: 'completed', playerCount: 4, players: STUB_PLAYERS,
  },
  {
    id: 'trip3', name: 'Pinehurst 2024', location: 'Pinehurst, NC',
    startDate: '2024-07-13', endDate: '2024-07-16',
    status: 'completed', playerCount: 4, players: STUB_PLAYERS,
  },
  {
    id: 'trip4', name: 'Kohler Trip 2023', location: 'Kohler, WI',
    startDate: '2023-08-20', endDate: '2023-08-23',
    status: 'completed', playerCount: 6, players: STUB_PLAYERS,
  },
]

export const STUB_UPCOMING_TRIPS: TripV2[] = [
  {
    id: 'trip5', name: 'Bandon Dunes 2026', location: 'Bandon, OR',
    startDate: '2026-05-15', endDate: '2026-05-19',
    status: 'setup', playerCount: 4, players: STUB_PLAYERS,
  },
]

// ─── Friends (for Profile > Friends) ─────────────────────────────────────────

export const STUB_FRIENDS: PlayerV2[] = STUB_PLAYERS.slice(1)

// ─── Feed ─────────────────────────────────────────────────────────────────────
// Consolidated events — each card groups a player's round, match result,
// and earnings from a single session.

export const STUB_FEED: FeedEventV2[] = [
  {
    id: 'fe1',
    userId: 'p2', userName: 'Jake', userAvatarUrl: null,
    timestamp: '2025-06-10T20:05:00Z',
    round:    { roundId: 'r1', courseName: 'Pebble Beach Golf Links', grossScore: 83, netScore: 71, par: 72, tripName: 'Pebble Beach 2025' },
    match:    { result: 'Lost 2 & 1', format: '2v2 Best Ball' },
    earnings: { net: -18 },
  },
  {
    id: 'fe2',
    userId: 'p3', userName: 'Mike', userAvatarUrl: null,
    timestamp: '2025-06-10T20:00:00Z',
    round:    { roundId: 'r1', courseName: 'Pebble Beach Golf Links', grossScore: 74, netScore: 69, par: 72, tripName: 'Pebble Beach 2025' },
    match:    { result: 'Wins 3 & 2', format: '1v1 Match Play' },
    earnings: { net: 22 },
  },
  {
    id: 'fe3',
    userId: 'p4', userName: 'Tom', userAvatarUrl: null,
    timestamp: '2025-06-09T21:00:00Z',
    round:    { roundId: 'r1', courseName: 'Spyglass Hill', grossScore: 91, netScore: 73, par: 72, tripName: 'Pebble Beach 2025' },
    match:    { result: 'Lost by 2', format: '1v1 Stroke Play' },
    earnings: { net: -26 },
  },
  {
    id: 'fe4',
    userId: 'p2', userName: 'Jake', userAvatarUrl: null,
    timestamp: '2025-05-28T19:00:00Z',
    round: { roundId: 'r1', courseName: 'TPC Sawgrass', grossScore: 79, netScore: 67, par: 72 },
  },
]

// ─── Friend Active Rounds ─────────────────────────────────────────────────────

export const STUB_FRIEND_ACTIVE_ROUNDS = [
  {
    userId: 'p3',
    userName: 'Mike',
    userAvatarUrl: null,
    courseName: 'Cypress Point',
    holesPlayed: 14,
    currentGross: 68,
    par: 72,
  },
]

// ─── Message Threads ──────────────────────────────────────────────────────────

export const STUB_THREADS: MessageThread[] = [
  {
    id: 'dm-p2', type: 'dm', name: 'Jake', avatarUrl: null,
    lastMessage: 'That eagle on 16 was insane 🔥', lastMessageAt: '2025-06-12T14:22:00Z',
    unreadCount: 2, friendUserId: 'p2',
  },
  {
    id: 'dm-p3', type: 'dm', name: 'Mike', avatarUrl: null,
    lastMessage: 'Good match man', lastMessageAt: '2025-06-11T21:05:00Z',
    unreadCount: 0, friendUserId: 'p3',
  },
  {
    id: 'dm-p4', type: 'dm', name: 'Tom', avatarUrl: null,
    lastMessage: "I'm paying everyone back Sunday", lastMessageAt: '2025-06-10T09:15:00Z',
    unreadCount: 0, friendUserId: 'p4',
  },
  {
    id: 'trip-trip1', type: 'trip', name: 'Pebble Beach 2025', avatarUrl: null,
    lastMessage: '🎉 Andrew birdied hole 12!', lastMessageAt: '2025-06-12T16:40:00Z',
    unreadCount: 5, tripId: 'trip1',
  },
  {
    id: 'trip-trip2', type: 'trip', name: 'Masters Trip 2024', avatarUrl: null,
    lastMessage: 'Best trip ever', lastMessageAt: '2024-04-12T22:00:00Z',
    unreadCount: 0, tripId: 'trip2',
  },
]

// ─── Chat Messages ────────────────────────────────────────────────────────────

export const STUB_CHAT_MESSAGES: ChatMessageV2[] = [
  {
    id: 'cm1', senderId: 'system', senderName: '', senderAvatarUrl: null,
    content: '🎉 Andrew birdied hole 12!', timestamp: '2025-06-12T16:40:00Z', isSystem: true,
  },
  {
    id: 'cm2', senderId: 'p2', senderName: 'Jake', senderAvatarUrl: null,
    content: 'LETS GOOOO', timestamp: '2025-06-12T16:41:00Z', isSystem: false,
  },
  {
    id: 'cm3', senderId: 'p3', senderName: 'Mike', senderAvatarUrl: null,
    content: 'Nice birdie Andrew 🔥', timestamp: '2025-06-12T16:42:00Z', isSystem: false,
  },
  {
    id: 'cm4', senderId: 'p1', senderName: 'Andrew', senderAvatarUrl: null,
    content: 'Barely made that putt 😅', timestamp: '2025-06-12T16:45:00Z', isSystem: false,
  },
  {
    id: 'cm5', senderId: 'system', senderName: '', senderAvatarUrl: null,
    content: '💀 Tom double-bogeyed hole 14', timestamp: '2025-06-12T17:10:00Z', isSystem: true,
  },
  {
    id: 'cm6', senderId: 'p4', senderName: 'Tom', senderAvatarUrl: null,
    content: 'That hole is cursed', timestamp: '2025-06-12T17:11:00Z', isSystem: false,
  },
]
