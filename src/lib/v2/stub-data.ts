// ─────────────────────────────────────────────────────────────────────────────
// STUB DATA — replace each export with real Supabase queries when ready
// ─────────────────────────────────────────────────────────────────────────────
import type {
  PlayerV2,
  MatchV2,
  TripV2,
  TripTeamV2,
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
  CourseDetailV2,
  FriendCourseRatingV2,
  UserHoleStatsV2,
} from './types'

// ─── Players ──────────────────────────────────────────────────────────────────

export const ME: PlayerV2 = { id: 'p1', name: 'Andrew Cole', avatarUrl: null, handicap: 8 }

export const STUB_PLAYERS: PlayerV2[] = [
  ME,
  { id: 'p2',  name: 'Jake Brennan',    avatarUrl: null, handicap: 12 },
  { id: 'p3',  name: 'Mike Stanton',    avatarUrl: null, handicap: 5  },
  { id: 'p4',  name: 'Tom Whitley',     avatarUrl: null, handicap: 18 },
  { id: 'p5',  name: 'Griffin Haas',    avatarUrl: null, handicap: 10 },
  { id: 'p6',  name: 'Danny Rizzo',     avatarUrl: null, handicap: 14 },
  { id: 'p7',  name: 'Chris Navarro',   avatarUrl: null, handicap: 7  },
  { id: 'p8',  name: 'Ryan Potts',      avatarUrl: null, handicap: 15 },
  { id: 'p9',  name: 'Matt Kessler',    avatarUrl: null, handicap: 6  },
  { id: 'p10', name: 'Tyler Dunn',      avatarUrl: null, handicap: 11 },
  { id: 'p11', name: 'Zach Fielding',   avatarUrl: null, handicap: 9  },
  { id: 'p12', name: 'Logan Marsh',     avatarUrl: null, handicap: 16 },
  { id: 'p13', name: 'Derek Solano',    avatarUrl: null, handicap: 4  },
  { id: 'p14', name: 'Sean Calloway',   avatarUrl: null, handicap: 13 },
  { id: 'p15', name: 'Kevin Odle',      avatarUrl: null, handicap: 10 },
  { id: 'p16', name: 'Brett Langford',  avatarUrl: null, handicap: 17 },
]

// ─── Teams ───────────────────────────────────────────────────────────────────

export const STUB_TEAMS: TripTeamV2[] = [
  { name: 'Team Nicklaus', color: '#dc2626', players: [STUB_PLAYERS[0], STUB_PLAYERS[1], STUB_PLAYERS[6], STUB_PLAYERS[7]]  },  // red — Andrew, Jake, Chris, Ryan
  { name: 'Team Palmer',   color: '#2563eb', players: [STUB_PLAYERS[2], STUB_PLAYERS[3], STUB_PLAYERS[8], STUB_PLAYERS[9]]  },  // blue — Mike, Tom, Matt, Tyler
  { name: 'Team Hogan',    color: '#d97706', players: [STUB_PLAYERS[4], STUB_PLAYERS[5], STUB_PLAYERS[10], STUB_PLAYERS[11]] }, // amber — Griffin, Danny, Zach, Logan
  { name: 'Team Jones',    color: '#16a34a', players: [STUB_PLAYERS[12], STUB_PLAYERS[13], STUB_PLAYERS[14], STUB_PLAYERS[15]] }, // green — Derek, Sean, Kevin, Brett
]

// ─── Active Trip ──────────────────────────────────────────────────────────────

export const ACTIVE_TRIP: TripV2 = {
  id: 'trip1',
  name: 'Pebble Beach 2025',
  location: 'Pebble Beach, CA',
  startDate: '2025-06-10',
  endDate: '2025-06-14',
  status: 'active',
  playerCount: 16,
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
  // ── Round 1: 4× 2v2 Best Ball at Pebble Beach (all completed) ────────────
  {
    id: 'm1', roundNumber: 1, format: '2v2_best_ball', formatLabel: '2v2 Best Ball', status: 'completed',
    teamA: { name: 'Team Nicklaus', players: [STUB_PLAYERS[0], STUB_PLAYERS[1]], points: 1, scoreDiffs: [4, 8] },
    teamB: { name: 'Team Palmer',   players: [STUB_PLAYERS[2], STUB_PLAYERS[3]], points: 0, scoreDiffs: [2, 12] },
    result: 'Team Nicklaus wins 3&2', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '7:30 AM', thru: 18, resultMargin: '3&2',
  },
  {
    id: 'm2', roundNumber: 1, format: '2v2_best_ball', formatLabel: '2v2 Best Ball', status: 'completed',
    teamA: { name: 'Team Hogan',  players: [STUB_PLAYERS[4], STUB_PLAYERS[5]], points: 0, scoreDiffs: [6, 10] },
    teamB: { name: 'Team Jones',  players: [STUB_PLAYERS[12], STUB_PLAYERS[13]], points: 1, scoreDiffs: [1, 5] },
    result: 'Team Jones wins 1UP', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '7:40 AM', thru: 18, resultMargin: '1UP',
  },
  {
    id: 'm3', roundNumber: 1, format: '2v2_best_ball', formatLabel: '2v2 Best Ball', status: 'completed',
    teamA: { name: 'Team Nicklaus', players: [STUB_PLAYERS[6], STUB_PLAYERS[7]], points: 1, scoreDiffs: [3, 7] },
    teamB: { name: 'Team Hogan',    players: [STUB_PLAYERS[10], STUB_PLAYERS[11]], points: 0, scoreDiffs: [5, 11] },
    result: 'Team Nicklaus wins 2&1', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '7:50 AM', thru: 18, resultMargin: '2&1',
  },
  {
    id: 'm4', roundNumber: 1, format: '2v2_best_ball', formatLabel: '2v2 Best Ball', status: 'completed',
    teamA: { name: 'Team Palmer', players: [STUB_PLAYERS[8], STUB_PLAYERS[9]], points: 0.5, scoreDiffs: [2, 6] },
    teamB: { name: 'Team Jones',  players: [STUB_PLAYERS[14], STUB_PLAYERS[15]], points: 0.5, scoreDiffs: [3, 9] },
    result: 'Halved', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '8:00 AM', thru: 18, resultMargin: 'AS',
  },
  // ── Round 2: 8× 1v1 Match Play at Pebble Beach (16 players) ──────────────
  {
    id: 'm5', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'completed',
    teamA: { name: 'Team Nicklaus', players: [STUB_PLAYERS[0]], points: 1, scoreDiffs: [4] },
    teamB: { name: 'Team Palmer',   players: [STUB_PLAYERS[2]], points: 0, scoreDiffs: [7] },
    result: 'Andrew wins 3&2', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '7:30 AM', thru: 18, resultMargin: '3&2',
  },
  {
    id: 'm6', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'completed',
    teamA: { name: 'Team Nicklaus', players: [STUB_PLAYERS[1]], points: 0, scoreDiffs: [9] },
    teamB: { name: 'Team Palmer',   players: [STUB_PLAYERS[3]], points: 1, scoreDiffs: [6] },
    result: 'Tom wins 1UP', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '7:40 AM', thru: 18, resultMargin: '1UP',
  },
  {
    id: 'm7', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'completed',
    teamA: { name: 'Team Nicklaus', players: [STUB_PLAYERS[6]], points: 0, scoreDiffs: [5] },
    teamB: { name: 'Team Jones',    players: [STUB_PLAYERS[12]], points: 1, scoreDiffs: [1] },
    result: 'Derek wins 2&1', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '7:50 AM', thru: 18, resultMargin: '2&1',
  },
  {
    id: 'm8', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'completed',
    teamA: { name: 'Team Nicklaus', players: [STUB_PLAYERS[7]], points: 1, scoreDiffs: [8] },
    teamB: { name: 'Team Hogan',    players: [STUB_PLAYERS[4]], points: 0, scoreDiffs: [10] },
    result: 'Ryan wins 2UP', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '8:00 AM', thru: 18, resultMargin: '2UP',
  },
  {
    id: 'm9', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'completed',
    teamA: { name: 'Team Hogan',  players: [STUB_PLAYERS[5]], points: 0.5, scoreDiffs: [8] },
    teamB: { name: 'Team Jones',  players: [STUB_PLAYERS[13]], points: 0.5, scoreDiffs: [8] },
    result: 'Halved', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '8:10 AM', thru: 18, resultMargin: 'AS',
  },
  {
    id: 'm10', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'completed',
    teamA: { name: 'Team Hogan',  players: [STUB_PLAYERS[10]], points: 1, scoreDiffs: [3] },
    teamB: { name: 'Team Palmer', players: [STUB_PLAYERS[8]], points: 0, scoreDiffs: [6] },
    result: 'Zach wins 4&3', statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '8:20 AM', thru: 18, resultMargin: '4&3',
  },
  {
    id: 'm11', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'pending',
    teamA: { name: 'Team Hogan',  players: [STUB_PLAYERS[11]], points: 0, scoreDiffs: [null] },
    teamB: { name: 'Team Jones',  players: [STUB_PLAYERS[14]], points: 0, scoreDiffs: [null] },
    result: null, statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '1:00 PM', thru: null, resultMargin: null,
  },
  {
    id: 'm12', roundNumber: 2, format: '1v1_match', formatLabel: '1v1 Match Play', status: 'pending',
    teamA: { name: 'Team Palmer', players: [STUB_PLAYERS[9]], points: 0, scoreDiffs: [null] },
    teamB: { name: 'Team Jones',  players: [STUB_PLAYERS[15]], points: 0, scoreDiffs: [null] },
    result: null, statusLabel: null,
    courseId: 'course1', courseName: 'Pebble Beach Golf Links', tripId: 'trip1',
    teeTime: '1:10 PM', thru: null, resultMargin: null,
  },
  // ── Round 3: 4× 2v2 Foursomes at Spyglass Hill (in_progress + pending) ───
  {
    id: 'm13', roundNumber: 3, format: '2v2_foursomes', formatLabel: '2v2 Foursomes', status: 'in_progress',
    teamA: { name: 'Team Nicklaus', players: [STUB_PLAYERS[0], STUB_PLAYERS[6]], points: 2, scoreDiffs: [3, 4] },
    teamB: { name: 'Team Palmer',   players: [STUB_PLAYERS[2], STUB_PLAYERS[8]], points: 1, scoreDiffs: [5, 6] },
    result: null, statusLabel: 'Team Nicklaus leads thru 12',
    courseId: 'course2', courseName: 'Spyglass Hill', tripId: 'trip1',
    teeTime: '8:00 AM', thru: 12, resultMargin: null,
  },
  {
    id: 'm14', roundNumber: 3, format: '2v2_foursomes', formatLabel: '2v2 Foursomes', status: 'in_progress',
    teamA: { name: 'Team Hogan', players: [STUB_PLAYERS[4], STUB_PLAYERS[10]], points: 1.5, scoreDiffs: [4, 3] },
    teamB: { name: 'Team Jones', players: [STUB_PLAYERS[12], STUB_PLAYERS[14]], points: 1.5, scoreDiffs: [4, 3] },
    result: null, statusLabel: 'All square thru 10',
    courseId: 'course2', courseName: 'Spyglass Hill', tripId: 'trip1',
    teeTime: '8:10 AM', thru: 10, resultMargin: null,
  },
  {
    id: 'm15', roundNumber: 3, format: '2v2_foursomes', formatLabel: '2v2 Foursomes', status: 'in_progress',
    teamA: { name: 'Team Palmer', players: [STUB_PLAYERS[3], STUB_PLAYERS[9]], points: 0.5, scoreDiffs: [11, 7] },
    teamB: { name: 'Team Nicklaus', players: [STUB_PLAYERS[1], STUB_PLAYERS[7]], points: 2.5, scoreDiffs: [5, 3] },
    result: null, statusLabel: 'Team Nicklaus leads thru 7',
    courseId: 'course2', courseName: 'Spyglass Hill', tripId: 'trip1',
    teeTime: '8:20 AM', thru: 7, resultMargin: null,
  },
  {
    id: 'm16', roundNumber: 3, format: '2v2_foursomes', formatLabel: '2v2 Foursomes', status: 'pending',
    teamA: { name: 'Team Jones', players: [STUB_PLAYERS[13], STUB_PLAYERS[15]], points: 0, scoreDiffs: [null, null] },
    teamB: { name: 'Team Hogan', players: [STUB_PLAYERS[5], STUB_PLAYERS[11]], points: 0, scoreDiffs: [null, null] },
    result: null, statusLabel: null,
    courseId: 'course2', courseName: 'Spyglass Hill', tripId: 'trip1',
    teeTime: '1:00 PM', thru: null, resultMargin: null,
  },
]

// ─── Player Leaderboard Stats ─────────────────────────────────────────────────

export const STUB_PLAYER_STATS: PlayerLeaderboardStats[] = [
  { player: STUB_PLAYERS[0],  matchRecord: { wins: 3, losses: 0, ties: 0 }, points: 4, grossAvg: 78.5, netAvg: 70.5, skinsWon: 3, fairwayPct: 61, girPct: 44, puttsAvg: 31.5 },
  { player: STUB_PLAYERS[1],  matchRecord: { wins: 1, losses: 1, ties: 0 }, points: 2, grossAvg: 82.0, netAvg: 70.0, skinsWon: 1, fairwayPct: 55, girPct: 38, puttsAvg: 33.0 },
  { player: STUB_PLAYERS[2],  matchRecord: { wins: 1, losses: 1, ties: 0 }, points: 1.5, grossAvg: 74.0, netAvg: 69.0, skinsWon: 4, fairwayPct: 72, girPct: 56, puttsAvg: 29.0 },
  { player: STUB_PLAYERS[3],  matchRecord: { wins: 1, losses: 1, ties: 0 }, points: 2, grossAvg: 90.5, netAvg: 72.5, skinsWon: 2, fairwayPct: 44, girPct: 28, puttsAvg: 35.0 },
  { player: STUB_PLAYERS[4],  matchRecord: { wins: 1, losses: 1, ties: 0 }, points: 1.5, grossAvg: 80.0, netAvg: 70.0, skinsWon: 1, fairwayPct: 58, girPct: 42, puttsAvg: 32.0 },
  { player: STUB_PLAYERS[5],  matchRecord: { wins: 0, losses: 2, ties: 0 }, points: 0, grossAvg: 86.0, netAvg: 72.0, skinsWon: 0, fairwayPct: 50, girPct: 35, puttsAvg: 34.0 },
  { player: STUB_PLAYERS[6],  matchRecord: { wins: 1, losses: 1, ties: 0 }, points: 2, grossAvg: 76.5, netAvg: 69.5, skinsWon: 2, fairwayPct: 65, girPct: 50, puttsAvg: 30.5 },
  { player: STUB_PLAYERS[7],  matchRecord: { wins: 1, losses: 0, ties: 0 }, points: 1.5, grossAvg: 87.0, netAvg: 72.0, skinsWon: 0, fairwayPct: 48, girPct: 30, puttsAvg: 34.5 },
  { player: STUB_PLAYERS[8],  matchRecord: { wins: 2, losses: 0, ties: 0 }, points: 2.5, grossAvg: 75.0, netAvg: 69.0, skinsWon: 3, fairwayPct: 70, girPct: 55, puttsAvg: 29.5 },
  { player: STUB_PLAYERS[9],  matchRecord: { wins: 1, losses: 0, ties: 0 }, points: 1, grossAvg: 83.0, netAvg: 72.0, skinsWon: 1, fairwayPct: 56, girPct: 40, puttsAvg: 32.5 },
  { player: STUB_PLAYERS[10], matchRecord: { wins: 1, losses: 1, ties: 1 }, points: 2, grossAvg: 79.5, netAvg: 70.5, skinsWon: 2, fairwayPct: 60, girPct: 45, puttsAvg: 31.0 },
  { player: STUB_PLAYERS[11], matchRecord: { wins: 0, losses: 2, ties: 0 }, points: 0, grossAvg: 89.0, netAvg: 73.0, skinsWon: 0, fairwayPct: 42, girPct: 25, puttsAvg: 35.5 },
  { player: STUB_PLAYERS[12], matchRecord: { wins: 2, losses: 0, ties: 0 }, points: 3, grossAvg: 73.5, netAvg: 69.5, skinsWon: 5, fairwayPct: 74, girPct: 58, puttsAvg: 28.5 },
  { player: STUB_PLAYERS[13], matchRecord: { wins: 1, losses: 0, ties: 0 }, points: 2, grossAvg: 85.0, netAvg: 72.0, skinsWon: 1, fairwayPct: 52, girPct: 36, puttsAvg: 33.5 },
  { player: STUB_PLAYERS[14], matchRecord: { wins: 0, losses: 1, ties: 1 }, points: 0.5, grossAvg: 81.0, netAvg: 71.0, skinsWon: 1, fairwayPct: 59, girPct: 43, puttsAvg: 31.5 },
  { player: STUB_PLAYERS[15], matchRecord: { wins: 0, losses: 1, ties: 0 }, points: 0, grossAvg: 91.0, netAvg: 74.0, skinsWon: 0, fairwayPct: 40, girPct: 22, puttsAvg: 36.0 },
]

// ─── Hole Leaderboard Stats ───────────────────────────────────────────────────

const _STUB_HCPS = [7, 15, 11, 3, 17, 1, 13, 5, 9, 8, 16, 12, 4, 2, 10, 18, 6, 14]
export const STUB_HOLE_STATS: HoleLeaderboardStats[] = Array.from({ length: 18 }, (_, i) => {
  const hole = i + 1
  const par = [4, 5, 3, 4, 3, 4, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5][i]
  return {
    holeNumber: hole,
    par,
    handicapIndex: _STUB_HCPS[i],
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
  { roundNumber: 2, courseId: 'course1', courseName: 'Pebble Beach Golf Links', par: 72 },
  { roundNumber: 3, courseId: 'course2', courseName: 'Spyglass Hill', par: 72 },
]

// ─── Per-Round Scores (for Individual Leaderboard) ────────────────────────────

export const STUB_ROUND_SCORES: TripRoundScoreV2[] = [
  // Round 1
  { playerId: 'p1',  roundNumber: 1, grossScore: 78, netScore: 70, par: 72 },
  { playerId: 'p2',  roundNumber: 1, grossScore: 85, netScore: 73, par: 72 },
  { playerId: 'p3',  roundNumber: 1, grossScore: 74, netScore: 69, par: 72 },
  { playerId: 'p4',  roundNumber: 1, grossScore: 93, netScore: 75, par: 72 },
  { playerId: 'p5',  roundNumber: 1, grossScore: 80, netScore: 70, par: 72 },
  { playerId: 'p6',  roundNumber: 1, grossScore: 88, netScore: 74, par: 72 },
  { playerId: 'p7',  roundNumber: 1, grossScore: 76, netScore: 69, par: 72 },
  { playerId: 'p8',  roundNumber: 1, grossScore: 89, netScore: 74, par: 72 },
  { playerId: 'p9',  roundNumber: 1, grossScore: 75, netScore: 69, par: 72 },
  { playerId: 'p10', roundNumber: 1, grossScore: 83, netScore: 72, par: 72 },
  { playerId: 'p11', roundNumber: 1, grossScore: 79, netScore: 70, par: 72 },
  { playerId: 'p12', roundNumber: 1, grossScore: 91, netScore: 75, par: 72 },
  { playerId: 'p13', roundNumber: 1, grossScore: 73, netScore: 69, par: 72 },
  { playerId: 'p14', roundNumber: 1, grossScore: 86, netScore: 73, par: 72 },
  { playerId: 'p15', roundNumber: 1, grossScore: 81, netScore: 71, par: 72 },
  { playerId: 'p16', roundNumber: 1, grossScore: 94, netScore: 77, par: 72 },
  // Round 2 (in progress — some still null)
  { playerId: 'p1',  roundNumber: 2, grossScore: 82, netScore: 74, par: 72 },
  { playerId: 'p2',  roundNumber: 2, grossScore: 89, netScore: 77, par: 72 },
  { playerId: 'p3',  roundNumber: 2, grossScore: 77, netScore: 72, par: 72 },
  { playerId: 'p4',  roundNumber: 2, grossScore: null, netScore: null, par: 72 },
  { playerId: 'p5',  roundNumber: 2, grossScore: 81, netScore: 71, par: 72 },
  { playerId: 'p6',  roundNumber: 2, grossScore: null, netScore: null, par: 72 },
  { playerId: 'p7',  roundNumber: 2, grossScore: 78, netScore: 71, par: 72 },
  { playerId: 'p8',  roundNumber: 2, grossScore: null, netScore: null, par: 72 },
  { playerId: 'p9',  roundNumber: 2, grossScore: 76, netScore: 70, par: 72 },
  { playerId: 'p10', roundNumber: 2, grossScore: null, netScore: null, par: 72 },
  { playerId: 'p11', roundNumber: 2, grossScore: 80, netScore: 71, par: 72 },
  { playerId: 'p12', roundNumber: 2, grossScore: null, netScore: null, par: 72 },
  { playerId: 'p13', roundNumber: 2, grossScore: 74, netScore: 70, par: 72 },
  { playerId: 'p14', roundNumber: 2, grossScore: null, netScore: null, par: 72 },
  { playerId: 'p15', roundNumber: 2, grossScore: 82, netScore: 72, par: 72 },
  { playerId: 'p16', roundNumber: 2, grossScore: null, netScore: null, par: 72 },
]

// ─── Hole Stats by Round (deterministic) ─────────────────────────────────────

const _PARS18 = [4, 5, 3, 4, 3, 4, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5]
const _HCPS18 = [7, 15, 11, 3, 17, 1, 13, 5, 9, 8, 16, 12, 4, 2, 10, 18, 6, 14]
const _GROSS_OFFSETS = [1.2, 0.8, 1.5, 1.0, 0.9, 1.3, 1.1, 0.7, 1.4, 1.0, 0.8, 1.2, 0.9, 1.1, 1.3, 0.6, 1.4, 1.2]
const _NET_OFFSETS   = [0.5, -0.3, 0.8, -0.4, 0.3, 0.6, -0.5, 0.2, 0.7, -0.2, 0.3, 0.6, -0.3, 0.5, 0.7, -0.4, 0.6, 0.5]
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
    handicapIndex: _HCPS18[i],
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
  3: _makeHoleStats(2),
}

// ─── Skins by Round ───────────────────────────────────────────────────────────

export const STUB_SKINS_BY_ROUND: Record<number, import('./types').SkinResultV2[]> = {
  3: Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1, par: _PARS18[i], winnerId: null, winnerName: null, grossScore: null, netScore: null,
  })),
  1: [
    { holeNumber:  1, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  2, par: 5, winnerId: 'p3',  winnerName: 'Mike Stanton',   grossScore: 4,    netScore: 3    },
    { holeNumber:  3, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  4, par: 4, winnerId: 'p1',  winnerName: 'Andrew Cole', grossScore: 4,    netScore: 3    },
    { holeNumber:  5, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  6, par: 4, winnerId: 'p3',  winnerName: 'Mike Stanton',   grossScore: 4,    netScore: 4    },
    { holeNumber:  7, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  8, par: 4, winnerId: 'p1',  winnerName: 'Andrew Cole', grossScore: 3,    netScore: 2    },
    { holeNumber:  9, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 10, par: 4, winnerId: 'p2',  winnerName: 'Jake Brennan',   grossScore: 3,    netScore: 2    },
    { holeNumber: 11, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 12, par: 4, winnerId: 'p3',  winnerName: 'Mike Stanton',   grossScore: 4,    netScore: 3    },
    { holeNumber: 13, par: 5, winnerId: 'p1',  winnerName: 'Andrew Cole', grossScore: 3,    netScore: 3    },
    { holeNumber: 14, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 15, par: 4, winnerId: 'p4',  winnerName: 'Tom Whitley',    grossScore: 4,    netScore: 3    },
    { holeNumber: 16, par: 3, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber: 17, par: 4, winnerId: 'p3',  winnerName: 'Mike Stanton',   grossScore: 4,    netScore: 3    },
    { holeNumber: 18, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
  ],
  2: [
    { holeNumber:  1, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  2, par: 5, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  3, par: 3, winnerId: 'p3',  winnerName: 'Mike Stanton',   grossScore: 3,    netScore: 2    },
    { holeNumber:  4, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  5, par: 3, winnerId: 'p1',  winnerName: 'Andrew Cole', grossScore: 2,    netScore: 2    },
    { holeNumber:  6, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  7, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  8, par: 4, winnerId: null,  winnerName: null,     grossScore: null, netScore: null },
    { holeNumber:  9, par: 5, winnerId: 'p4',  winnerName: 'Tom Whitley',    grossScore: 5,    netScore: 3    },
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
  { player: STUB_PLAYERS[0],  team:  20, matches:  25, skins:  12, netTotal:  57 },
  { player: STUB_PLAYERS[1],  team:  20, matches: -10, skins:  -8, netTotal:   2 },
  { player: STUB_PLAYERS[2],  team: -10, matches:  -5, skins:  16, netTotal:   1 },
  { player: STUB_PLAYERS[3],  team: -10, matches:  10, skins:  -4, netTotal:  -4 },
  { player: STUB_PLAYERS[4],  team:  -5, matches:   5, skins:   4, netTotal:   4 },
  { player: STUB_PLAYERS[5],  team:  -5, matches: -15, skins:  -8, netTotal: -28 },
  { player: STUB_PLAYERS[6],  team:  20, matches:  10, skins:   8, netTotal:  38 },
  { player: STUB_PLAYERS[7],  team:  20, matches:   5, skins:  -4, netTotal:  21 },
  { player: STUB_PLAYERS[8],  team: -10, matches:  15, skins:  12, netTotal:  17 },
  { player: STUB_PLAYERS[9],  team: -10, matches:   5, skins:   4, netTotal:  -1 },
  { player: STUB_PLAYERS[10], team:  -5, matches:   5, skins:   8, netTotal:   8 },
  { player: STUB_PLAYERS[11], team:  -5, matches: -15, skins: -12, netTotal: -32 },
  { player: STUB_PLAYERS[12], team:  10, matches:  20, skins:  20, netTotal:  50 },
  { player: STUB_PLAYERS[13], team:  10, matches:   5, skins:   4, netTotal:  19 },
  { player: STUB_PLAYERS[14], team:  10, matches: -10, skins:   4, netTotal:   4 },
  { player: STUB_PLAYERS[15], team:  10, matches: -15, skins: -12, netTotal: -17 },
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
    roundId: 'r1',
  },
  {
    courseId: 'course1',
    courseName: 'Pebble Beach Golf Links',
    date: '2024-06-05',
    grossScore: 82,
    netScore: 74,
    par: 72,
    tripName: 'Pebble Beach 2024',
    rating: 9.8,
    latitude: 36.5677,
    longitude: -121.9500,
    roundId: 'r6',
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
    roundId: 'r2',
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
    roundId: 'r3',
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
    roundId: 'r5',
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
    userId: 'p2', userName: 'Jake Brennan', userAvatarUrl: null,
    timestamp: '2025-06-10T20:05:00Z',
    round:    { roundId: 'r1', courseName: 'Pebble Beach Golf Links', grossScore: 83, netScore: 71, par: 72, tripName: 'Pebble Beach 2025' },
    match:    { result: 'Lost 2 & 1', format: '2v2 Best Ball' },
    earnings: { net: -18 },
  },
  {
    id: 'fe2',
    userId: 'p3', userName: 'Mike Stanton', userAvatarUrl: null,
    timestamp: '2025-06-10T20:00:00Z',
    round:    { roundId: 'r1', courseName: 'Pebble Beach Golf Links', grossScore: 74, netScore: 69, par: 72, tripName: 'Pebble Beach 2025' },
    match:    { result: 'Wins 3 & 2', format: '1v1 Match Play' },
    earnings: { net: 22 },
  },
  {
    id: 'fe3',
    userId: 'p4', userName: 'Tom Whitley', userAvatarUrl: null,
    timestamp: '2025-06-09T21:00:00Z',
    round:    { roundId: 'r1', courseName: 'Spyglass Hill', grossScore: 91, netScore: 73, par: 72, tripName: 'Pebble Beach 2025' },
    match:    { result: 'Lost by 2', format: '1v1 Stroke Play' },
    earnings: { net: -26 },
  },
  {
    id: 'fe4',
    userId: 'p2', userName: 'Jake Brennan', userAvatarUrl: null,
    timestamp: '2025-05-28T19:00:00Z',
    round: { roundId: 'r1', courseName: 'TPC Sawgrass', grossScore: 79, netScore: 67, par: 72 },
  },
]

// ─── Friend Active Rounds ─────────────────────────────────────────────────────

export const STUB_FRIEND_ACTIVE_ROUNDS = [
  {
    userId: 'p3',
    userName: 'Mike Stanton',
    userAvatarUrl: null,
    roundId: 'round1',
    courseName: 'Cypress Point',
    holesPlayed: 14,
    currentGross: 68,
    par: 72,
  },
]

// ─── Message Threads ──────────────────────────────────────────────────────────

export const STUB_THREADS: MessageThread[] = [
  {
    id: 'dm-p2', type: 'dm', name: 'Jake Brennan', avatarUrl: null,
    lastMessage: 'That eagle on 16 was insane 🔥', lastMessageAt: '2025-06-12T14:22:00Z',
    unreadCount: 2, friendUserId: 'p2',
  },
  {
    id: 'dm-p3', type: 'dm', name: 'Mike Stanton', avatarUrl: null,
    lastMessage: 'Good match man', lastMessageAt: '2025-06-11T21:05:00Z',
    unreadCount: 0, friendUserId: 'p3',
  },
  {
    id: 'dm-p4', type: 'dm', name: 'Tom Whitley', avatarUrl: null,
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

// ─── Course Details ──────────────────────────────────────────────────────────

export const STUB_COURSE_DETAILS: Record<string, CourseDetailV2> = {
  course1: {
    courseId: 'course1',
    courseName: 'Pebble Beach Golf Links',
    location: '1700 17-Mile Drive, Pebble Beach, CA 93953',
    par: 72,
    slope: 145,
    courseRating: 74.3,
    avgUserRating: 9.2,
    totalRatings: 14,
    conditionRating: 9.4,
    layoutRating: 9.6,
    valueRating: 7.8,
    tees: [
      { name: 'Blue', yardage: 6828, slope: 145, rating: 74.3 },
      { name: 'White', yardage: 6414, slope: 138, rating: 72.1 },
      { name: 'Red', yardage: 5574, slope: 126, rating: 68.5 },
    ],
    website: 'https://www.pebblebeach.com',
    phone: '(831) 574-5609',
    photoUrls: [
      '/images/course-placeholder-1.jpg',
      '/images/course-placeholder-2.jpg',
      '/images/course-placeholder-3.jpg',
    ],
    latitude: 36.5677,
    longitude: -121.9500,
  },
  course3: {
    courseId: 'course3',
    courseName: 'Augusta National',
    location: '2604 Washington Rd, Augusta, GA 30904',
    par: 72,
    slope: 148,
    courseRating: 76.2,
    avgUserRating: 9.6,
    totalRatings: 8,
    conditionRating: 9.8,
    layoutRating: 9.5,
    valueRating: 8.0,
    tees: [
      { name: 'Masters', yardage: 7475, slope: 148, rating: 76.2 },
      { name: 'Member', yardage: 6365, slope: 137, rating: 72.8 },
    ],
    website: null,
    phone: null,
    photoUrls: [
      '/images/course-placeholder-1.jpg',
      '/images/course-placeholder-2.jpg',
    ],
    latitude: 33.5021,
    longitude: -82.0232,
  },
  course4: {
    courseId: 'course4',
    courseName: 'Pinehurst No. 2',
    location: '80 Carolina Vista Dr, Pinehurst, NC 28374',
    par: 70,
    slope: 140,
    courseRating: 73.8,
    avgUserRating: 8.8,
    totalRatings: 11,
    conditionRating: 8.5,
    layoutRating: 9.0,
    valueRating: 8.8,
    tees: [
      { name: 'Championship', yardage: 7588, slope: 140, rating: 73.8 },
      { name: 'Resort', yardage: 6572, slope: 131, rating: 71.2 },
      { name: 'Forward', yardage: 5586, slope: 122, rating: 67.9 },
    ],
    website: 'https://www.pinehurst.com',
    phone: '(910) 295-6811',
    photoUrls: [
      '/images/course-placeholder-1.jpg',
    ],
    latitude: 35.1954,
    longitude: -79.4699,
  },
  course5: {
    courseId: 'course5',
    courseName: 'Whistling Straits',
    location: 'N8501 County Rd LS, Sheboygan, WI 53083',
    par: 72,
    slope: 151,
    courseRating: 76.7,
    avgUserRating: 8.4,
    totalRatings: 6,
    conditionRating: 8.2,
    layoutRating: 8.8,
    valueRating: 7.6,
    tees: [
      { name: 'Straits', yardage: 7790, slope: 151, rating: 76.7 },
      { name: 'Middle', yardage: 7011, slope: 141, rating: 73.4 },
      { name: 'Forward', yardage: 6221, slope: 130, rating: 69.8 },
    ],
    website: 'https://www.americanclubresort.com',
    phone: '(920) 565-6050',
    photoUrls: [
      '/images/course-placeholder-1.jpg',
      '/images/course-placeholder-2.jpg',
    ],
    latitude: 43.8567,
    longitude: -87.7245,
  },
}

// ─── Friend Course Ratings ───────────────────────────────────────────────────

export const STUB_FRIEND_COURSE_RATINGS: Record<string, FriendCourseRatingV2[]> = {
  course1: [
    { player: STUB_PLAYERS[1], rating: 9.0, bestGross: 83, lastPlayed: '2025-06-11', roundId: 'r1' },
    { player: STUB_PLAYERS[2], rating: 9.5, bestGross: 74, lastPlayed: '2025-06-11', roundId: 'r1' },
    { player: STUB_PLAYERS[3], rating: 8.8, bestGross: 93, lastPlayed: '2025-06-11', roundId: 'r1' },
  ],
  course3: [
    { player: STUB_PLAYERS[2], rating: 9.8, bestGross: 76, lastPlayed: '2024-04-10', roundId: 'r2' },
    { player: STUB_PLAYERS[4], rating: 9.2, bestGross: 82, lastPlayed: '2024-04-10', roundId: null },
  ],
  course4: [
    { player: STUB_PLAYERS[1], rating: 8.4, bestGross: 86, lastPlayed: '2024-07-15', roundId: 'r3' },
    { player: STUB_PLAYERS[3], rating: 7.9, bestGross: 95, lastPlayed: '2024-07-15', roundId: null },
    { player: STUB_PLAYERS[5], rating: 8.7, bestGross: 84, lastPlayed: '2024-07-15', roundId: null },
  ],
  course5: [
    { player: STUB_PLAYERS[1], rating: 8.0, bestGross: 88, lastPlayed: '2023-08-22', roundId: 'r5' },
    { player: STUB_PLAYERS[4], rating: 8.5, bestGross: 85, lastPlayed: '2023-08-22', roundId: null },
  ],
}

// ─── User Hole Stats (per course) ───────────────────────────────────────────

const _COURSE_PARS: Record<string, number[]> = {
  course1: [4, 5, 3, 4, 3, 4, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5],
  course3: [4, 5, 3, 4, 3, 5, 4, 4, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
  course4: [4, 4, 3, 4, 4, 3, 4, 5, 4, 5, 3, 4, 4, 4, 3, 4, 5, 4],
  course5: [4, 5, 3, 4, 4, 3, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5],
}

const _COURSE_HCPS: Record<string, number[]> = {
  course1: [7, 15, 11, 3, 17, 1, 13, 5, 9, 8, 16, 12, 4, 2, 10, 18, 6, 14],
  course3: [5, 13, 15, 1, 17, 3, 11, 7, 9, 6, 8, 16, 2, 10, 4, 18, 12, 14],
  course4: [3, 9, 17, 1, 7, 15, 11, 5, 13, 4, 18, 8, 6, 10, 16, 12, 2, 14],
  course5: [7, 13, 15, 1, 5, 17, 9, 11, 3, 8, 16, 10, 4, 6, 12, 18, 2, 14],
}

function _makeUserHoleStats(courseId: string, rounds: number = 5): UserHoleStatsV2[] {
  const pars = _COURSE_PARS[courseId] ?? _COURSE_PARS.course1
  const hcps = _COURSE_HCPS[courseId] ?? _COURSE_HCPS.course1
  const avgOffsets = [0.4, 0.2, 0.8, 0.3, 0.6, 0.5, 0.3, 0.1, 0.4, 0.3, 0.7, 0.5, 0.2, 0.4, 0.6, 0.3, 0.5, 0.4]
  const netOffsets = [0.1, -0.2, 0.4, -0.1, 0.2, 0.1, -0.2, -0.3, 0.1, -0.1, 0.3, 0.2, -0.2, 0.1, 0.3, -0.1, 0.2, 0.1]
  const bestOffsets = [0, -1, 1, 0, 0, 1, 0, -1, 0, -1, 1, 0, -1, 0, 1, 0, 0, -1]
  // Each column (hole) sums to `rounds` (default 5)
  const eaglesCnt= [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]
  const birdies =  [1, 2, 0, 1, 0, 0, 1, 2, 1, 2, 0, 1, 1, 1, 0, 1, 0, 1]
  const parsCnt =  [3, 2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3]
  const bogeys =   [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1]
  const doubles =  [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0]
  const fwPcts =   [65, 70, null, 55, null, 60, 50, 75, 60, 65, null, 55, 70, 60, 65, null, 55, 60]
  const girPcts =  [50, 60, 35, 45, 40, 45, 55, 65, 50, 55, 30, 40, 60, 50, 45, 55, 40, 50]
  const putts =    [1.8, 1.7, 2.0, 1.9, 2.1, 1.9, 1.7, 1.6, 1.8, 1.7, 2.2, 1.9, 1.7, 1.8, 2.0, 1.6, 1.9, 1.8]

  const scale = rounds / 5
  return pars.map((par, i) => ({
    holeNumber: i + 1,
    par,
    handicapIndex: hcps[i],
    avgGross: parseFloat((par + avgOffsets[i]).toFixed(1)),
    avgNet: parseFloat((par + netOffsets[i]).toFixed(1)),
    bestGross: par + bestOffsets[i],
    birdies: Math.round(birdies[i] * scale),
    eagles: Math.round(eaglesCnt[i] * scale),
    pars: Math.round(parsCnt[i] * scale),
    bogeys: Math.round(bogeys[i] * scale),
    doubles: Math.round(doubles[i] * scale),
    avgPutts: putts[i],
    fairwayPct: fwPcts[i] as number | null,
    girPct: girPcts[i],
  }))
}

export const STUB_USER_HOLE_STATS: Record<string, Record<string, UserHoleStatsV2[]>> = {
  course1: {
    [ME.id]: _makeUserHoleStats('course1', 1),
    p2: _makeUserHoleStats('course1', 5).map(h => ({ ...h, avgGross: +(h.avgGross + 0.4).toFixed(1), birdies: Math.max(0, h.birdies - 1), bogeys: h.bogeys + 1 })),
  },
  course3: { [ME.id]: _makeUserHoleStats('course3', 1) },
  course4: { [ME.id]: _makeUserHoleStats('course4', 1) },
  course5: { [ME.id]: _makeUserHoleStats('course5', 1) },
}

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
