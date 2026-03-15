// ─────────────────────────────────────────────────────────────────────────────
// v2 data models — STUB shapes, not yet wired to Supabase
// Reference src/lib/types.ts for the canonical backend types.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerV2 {
  id: string
  name: string          // first name for display
  avatarUrl: string | null
  handicap: number | null
}

export interface HoleScoreV2 {
  holeId: string
  holeNumber: number
  par: number
  handicapIndex: number | null
  gross: number | null
  net: number | null
  fairwayHit: boolean | null
  gir: boolean | null
  putts: number | null
}

export interface ScorecardPlayerV2 {
  player: PlayerV2
  holes: HoleScoreV2[]
  grossTotal: number | null
  netTotal: number | null
}

export interface ScorecardV2 {
  courseId: string
  courseName: string
  date: string
  par: number
  roundNumber: number | null
  players: ScorecardPlayerV2[]
}

export interface MatchV2 {
  id: string
  roundNumber: number
  format: string
  formatLabel: string
  status: 'pending' | 'in_progress' | 'completed'
  teamA: { name: string; players: PlayerV2[]; points: number }
  teamB: { name: string; players: PlayerV2[]; points: number }
  result: string | null
  statusLabel: string | null
  courseId: string
  courseName: string
  tripId: string
  teeTime: string | null
  thru: number | null
  resultMargin: string | null
  teamAScoreDiff: number | null
  teamBScoreDiff: number | null
}

export interface TripV2 {
  id: string
  name: string
  location: string | null
  startDate: string | null
  endDate: string | null
  status: 'setup' | 'active' | 'completed'
  playerCount: number
  players: PlayerV2[]
}

export interface RoundV2 {
  id: string
  courseId: string
  courseName: string
  date: string
  tripId: string | null
  tripName: string | null
  isQuickRound: boolean
  grossTotal: number | null
  netTotal: number | null
  par: number
  holesPlayed: number
  latitude: number | null
  longitude: number | null
}

// Consolidated feed event — groups round, match, and earnings from a single session
export interface FeedEventV2 {
  id: string
  userId: string
  userName: string
  userAvatarUrl: string | null
  timestamp: string
  round?: {
    roundId?: string
    courseName: string
    grossScore: number
    netScore?: number
    par: number
    tripName?: string
  }
  match?: {
    result: string
    format: string
  }
  earnings?: {
    net: number
  }
}

export interface PlayerLeaderboardStats {
  player: PlayerV2
  matchRecord: { wins: number; losses: number; ties: number }
  points: number
  grossAvg: number | null
  netAvg: number | null
  skinsWon: number
  fairwayPct: number | null
  girPct: number | null
  puttsAvg: number | null
}

export interface HoleLeaderboardStats {
  holeNumber: number
  par: number
  handicapIndex: number
  avgGross: number
  avgNet: number
  birdiesOrBetter: number
  pars: number
  bogeysOrWorse: number
  fairwayPct: number | null
  girPct: number | null
  avgPutts: number | null
}

export interface PlayerEarnings {
  player: PlayerV2
  netEarnings: number
  breakdown: { label: string; amount: number }[]
}

export interface CoursePinV2 {
  courseId: string
  courseName: string
  date: string
  grossScore: number | null
  netScore: number | null
  par: number
  tripName: string | null
  rating: number | null   // 0.0–10.0; null = unrated
  latitude: number
  longitude: number
  roundId: string | null  // links pin to a round for scorecard navigation
}

export interface MessageThread {
  id: string
  type: 'dm' | 'trip'
  name: string
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  // dm
  friendUserId?: string
  // trip
  tripId?: string
}

export interface ChatMessageV2 {
  id: string
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
  content: string
  timestamp: string
  isSystem: boolean
}

export interface TripRoundV2 {
  roundNumber: number
  courseId: string
  courseName: string
  par: number
}

export interface SkinResultV2 {
  holeNumber: number
  par: number
  winnerId: string | null
  winnerName: string | null
  grossScore: number | null
  netScore: number | null
}

export interface TripRoundScoreV2 {
  playerId: string
  roundNumber: number
  grossScore: number | null
  netScore: number | null
  par: number
}

export interface TripEarningsRow {
  player: PlayerV2
  team: number
  matches: number
  skins: number
  netTotal: number
}

export interface TripTeamV2 {
  name: string
  color: string
  players: PlayerV2[]
}

// ─── Course Detail Types ──────────────────────────────────────────────────────

export interface CourseDetailV2 {
  courseId: string
  courseName: string
  location: string
  par: number
  slope: number | null
  courseRating: number | null
  avgUserRating: number | null
  totalRatings: number
  conditionRating: number | null
  layoutRating: number | null
  valueRating: number | null
  tees: { name: string; yardage: number; slope: number; rating: number }[]
  website: string | null
  phone: string | null
  photoUrls: string[]
  latitude: number
  longitude: number
}

export interface FriendCourseRatingV2 {
  player: PlayerV2
  rating: number | null
  bestGross: number | null
  lastPlayed: string | null
  roundId: string | null
}

export interface UserHoleStatsV2 {
  holeNumber: number
  par: number
  handicapIndex: number
  avgGross: number
  bestGross: number
  birdies: number
  pars: number
  bogeys: number
  doubles: number
  eagles: number
  avgPutts: number | null
  fairwayPct: number | null
  girPct: number | null
}
