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
