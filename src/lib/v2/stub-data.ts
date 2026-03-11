// ─────────────────────────────────────────────────────────────────────────────
// STUB DATA — replace each export with real Supabase queries when ready
// ─────────────────────────────────────────────────────────────────────────────
import type {
  PlayerV2,
  MatchV2,
  TripV2,
  RoundV2,
  FeedItemV2,
  PlayerLeaderboardStats,
  HoleLeaderboardStats,
  PlayerEarnings,
  CoursePinV2,
  MessageThread,
  ChatMessageV2,
  ScorecardV2,
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
    format: '2v2_best_ball',
    formatLabel: '2v2 Best Ball',
    status: 'in_progress',
    teamA: { players: [STUB_PLAYERS[0], STUB_PLAYERS[1]], points: 2.5 },
    teamB: { players: [STUB_PLAYERS[2], STUB_PLAYERS[3]], points: 1.5 },
    result: null,
    statusLabel: 'Andrew & Jake lead 2.5–1.5 thru 9',
    courseId: 'course2',
    courseName: 'Spyglass Hill',
    tripId: 'trip1',
  },
  {
    id: 'm2',
    format: '1v1_match',
    formatLabel: '1v1 Match Play',
    status: 'completed',
    teamA: { players: [STUB_PLAYERS[0]], points: 1 },
    teamB: { players: [STUB_PLAYERS[2]], points: 0 },
    result: 'Andrew wins 3&2',
    statusLabel: null,
    courseId: 'course1',
    courseName: 'Pebble Beach Golf Links',
    tripId: 'trip1',
  },
  {
    id: 'm3',
    format: '1v1_stroke',
    formatLabel: '1v1 Stroke Play',
    status: 'completed',
    teamA: { players: [STUB_PLAYERS[1]], points: 0 },
    teamB: { players: [STUB_PLAYERS[3]], points: 1 },
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
    netEarnings: 47,
    breakdown: [
      { label: 'Match results', amount: 30 },
      { label: 'Skins', amount: 24 },
      { label: 'Side bets', amount: -7 },
    ],
  },
  {
    player: STUB_PLAYERS[2],
    netEarnings: 18,
    breakdown: [
      { label: 'Match results', amount: -10 },
      { label: 'Skins', amount: 32 },
      { label: 'Side bets', amount: -4 },
    ],
  },
  {
    player: STUB_PLAYERS[1],
    netEarnings: -22,
    breakdown: [
      { label: 'Match results', amount: -10 },
      { label: 'Skins', amount: 8 },
      { label: 'Side bets', amount: -20 },
    ],
  },
  {
    player: STUB_PLAYERS[3],
    netEarnings: -43,
    breakdown: [
      { label: 'Match results', amount: -10 },
      { label: 'Skins', amount: -16 },
      { label: 'Side bets', amount: -17 },
    ],
  },
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
    rating: 10,
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
    rating: 10,
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
    rating: 8,
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
    rating: 8,
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

export const STUB_FEED: FeedItemV2[] = [
  {
    id: 'f1', type: 'round', userId: 'p2', userName: 'Jake', userAvatarUrl: null,
    timestamp: '2025-06-10T18:30:00Z', courseName: 'Pebble Beach Golf Links',
    grossScore: 83, netScore: 71, par: 72, tripName: 'Pebble Beach 2025',
  },
  {
    id: 'f2', type: 'match', userId: 'p3', userName: 'Mike', userAvatarUrl: null,
    timestamp: '2025-06-10T20:00:00Z', matchResult: 'Mike wins 3&2',
    matchFormat: '1v1 Match Play', courseName: 'Pebble Beach Golf Links',
  },
  {
    id: 'f3', type: 'earnings', userId: 'p2', userName: 'Jake', userAvatarUrl: null,
    timestamp: '2025-06-10T20:05:00Z', amount: -28, earningsSource: 'Skins',
  },
  {
    id: 'f4', type: 'skin', userId: 'p3', userName: 'Mike', userAvatarUrl: null,
    timestamp: '2025-06-09T17:45:00Z', holeNumber: 7, courseName: 'Cypress Point',
  },
  {
    id: 'f5', type: 'round', userId: 'p2', userName: 'Jake', userAvatarUrl: null,
    timestamp: '2025-05-28T19:00:00Z', courseName: 'TPC Sawgrass',
    grossScore: 79, netScore: 67, par: 72,
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
