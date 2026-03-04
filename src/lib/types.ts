export interface Trip {
  id: string
  name: string
  year: number
  location: string | null
  status: 'setup' | 'active' | 'completed'
  match_buy_in: number
  skins_buy_in: number
  skins_mode: 'gross' | 'net' | 'both'
  handicap_mode: 'static' | 'dynamic'
  created_at: string
  updated_at: string
  created_by: string | null
  join_code: string | null
  group_id: string | null
}

// ============================================================================
// Groups Types
// ============================================================================

export type GroupRole = 'owner' | 'admin' | 'member'

export interface Group {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
}

export interface Course {
  id: string
  trip_id: string
  name: string
  slope: number | null
  rating: number | null
  par: number
  round_number: number
  round_date: string | null
  created_at: string
  golf_course_api_id?: number | null
  holes?: Hole[]
  default_match_format?: string | null
  default_point_value?: number | null
  format_config?: Record<string, unknown> | null
}

export interface Hole {
  id: string
  course_id: string
  hole_number: number
  par: number
  handicap_index: number
  yardage?: Record<string, number> // e.g. {"White": 345, "Blue": 372}
}

export interface Player {
  id: string
  name: string
  email: string | null
  phone: string | null
  handicap_index: number | null
  created_at: string
  user_id: string | null
}

export type TripRole = 'owner' | 'admin' | 'player'

export interface PlayerProfile {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  ghin_number: string | null
  handicap_index: number | null
  home_club: string | null
  preferred_tee: string | null
  bio: string | null
  venmo_username: string | null
  cashapp_cashtag: string | null
  zelle_email: string | null
  created_at: string
  updated_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role: TripRole
  created_at: string
}

export interface TripPlayer {
  id: string
  trip_id: string
  player_id: string
  paid: boolean
  player?: Player
}

export interface PlayerCourseHandicap {
  id: string
  trip_player_id: string
  course_id: string
  handicap_strokes: number
}

export interface Team {
  id: string
  trip_id: string
  name: string
  players?: TripPlayer[]
}

export interface Match {
  id: string
  course_id: string
  format: '1v1_stroke' | '2v2_best_ball' | '1v1_match' | '2v2_alternate_shot'
  point_value: number
  scorer_email: string | null
  scorer_token: string
  status: 'pending' | 'in_progress' | 'completed'
  result: string | null
  winner_side: 'team_a' | 'team_b' | 'tie' | null
  created_at: string
  match_players?: MatchPlayer[]
}

export interface MatchPlayer {
  id: string
  match_id: string
  trip_player_id: string
  side: 'team_a' | 'team_b'
  trip_player?: TripPlayer
}

export interface Score {
  id: string
  match_id: string
  trip_player_id: string
  hole_id: string
  gross_score: number
  created_at: string
  updated_at: string
}

export interface RoundScore {
  id: string
  course_id: string
  trip_player_id: string
  hole_id: string
  gross_score: number
  entered_by: string | null
  fairway_hit?: boolean | null
  gir?: boolean | null
  putts?: number | null
  created_at: string
  updated_at: string
}

export interface TripInvite {
  id: string
  trip_id: string
  player_id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  invited_by: string | null
  created_at: string
  accepted_at: string | null
}

export type MatchFormat = Match['format']

export const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  '1v1_stroke': '1v1 Stroke Play',
  '2v2_best_ball': '2v2 Best Ball',
  '1v1_match': '1v1 Match Play',
  '2v2_alternate_shot': '2v2 Alternate Shot',
}

// ============================================================================
// Game Engine Types
// ============================================================================

export type ScoringType = 'points' | 'match' | 'strokes' | 'dots' | 'side_bet'
export type GameScope = 'foursome' | 'group'
export type RoundGameStatus = 'setup' | 'active' | 'finalized' | 'cancelled'
export type SideBetType = 'birdie' | 'eagle' | 'greenie' | 'sandie' | 'barkie' | 'chippie' | 'arnie' | 'custom'
export type SettlementSourceType = 'game_result' | 'side_bet' | 'expense' | 'adjustment'

export interface GameFormat {
  id: string
  name: string
  description: string | null
  rules_summary: string | null
  icon: string
  scoring_type: ScoringType
  scope: GameScope
  min_players: number
  max_players: number
  team_based: boolean
  engine_key: string
  default_config: Record<string, unknown>
  tier: number
  active: boolean
  created_at: string
}

export interface RoundGame {
  id: string
  course_id: string
  trip_id: string
  game_format_id: string
  config: Record<string, unknown>
  buy_in: number
  status: RoundGameStatus
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  game_format?: GameFormat
  round_game_players?: RoundGamePlayer[]
}

export interface RoundGamePlayer {
  id: string
  round_game_id: string
  trip_player_id: string
  side: 'team_a' | 'team_b' | 'team_c' | 'team_d' | null
  metadata: Record<string, unknown>
  // Joined
  trip_player?: TripPlayer
}

export interface GameResult {
  id: string
  round_game_id: string
  trip_player_id: string
  position: number | null
  points: number
  money: number
  details: Record<string, unknown>
  computed_at: string
}

export interface SideBet {
  id: string
  trip_id: string
  bet_type: SideBetType
  custom_label: string | null
  value: number
  active: boolean
  created_at: string
}

export interface SideBetHit {
  id: string
  side_bet_id: string
  trip_player_id: string
  hole_id: string
  course_id: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface SettlementEntry {
  id: string
  trip_id: string
  trip_player_id: string
  source_type: SettlementSourceType
  source_id: string | null
  amount: number
  description: string | null
  created_at: string
}

// ============================================================================
// Game Engine Interfaces — used by pure function engines
// ============================================================================

/** Standard input to all game engines */
export interface GameEngineInput {
  scores: {
    trip_player_id: string
    hole_id: string
    gross_score: number
  }[]
  players: {
    trip_player_id: string
    side: string | null
    metadata: Record<string, unknown>
  }[]
  holes: {
    id: string
    hole_number: number
    par: number
    handicap_index: number
  }[]
  /** Per-player strokes map: trip_player_id -> Map<hole_number, strokes> */
  playerStrokes: Map<string, Map<number, number>>
  /** Game-specific configuration */
  config: Record<string, unknown>
}

/** Standard output from all game engines */
export interface GameEngineResult {
  /** Per-player results */
  players: {
    trip_player_id: string
    position: number
    points: number
    money: number
    details: Record<string, unknown>
  }[]
  /** Hole-by-hole breakdown (engine-specific) */
  holes: Record<string, unknown>[]
  /** Summary text for display */
  summary: string
}

// ============================================================================
// Stats & Awards Types
// ============================================================================

export interface RoundStats {
  id: string
  course_id: string
  trip_player_id: string
  gross_total: number | null
  net_total: number | null
  par_total: number | null
  holes_played: number
  eagles: number
  birdies: number
  pars: number
  bogeys: number
  double_bogeys: number
  others: number
  par_or_better_streak: number
  bogey_or_better_streak: number
  best_hole_score: number | null
  best_hole_number: number | null
  worst_hole_score: number | null
  worst_hole_number: number | null
  best_hole_vs_par: number | null
  worst_hole_vs_par: number | null
  par3_total: number | null
  par3_count: number
  par4_total: number | null
  par4_count: number
  par5_total: number | null
  par5_count: number
  front_nine_gross: number | null
  front_nine_net: number | null
  back_nine_gross: number | null
  back_nine_net: number | null
  greens_in_regulation: number
  bounce_backs: number
  scoring_average: number | null
  computed_at: string
}

export interface TripStats {
  id: string
  trip_id: string
  trip_player_id: string
  total_gross: number | null
  total_net: number | null
  total_par: number | null
  total_holes: number
  total_rounds: number
  total_eagles: number
  total_birdies: number
  total_pars: number
  total_bogeys: number
  total_double_bogeys: number
  total_others: number
  best_round_gross: number | null
  best_round_course_id: string | null
  worst_round_gross: number | null
  worst_round_course_id: string | null
  longest_par_streak: number
  longest_bogey_streak: number
  total_bounce_backs: number
  scoring_average: number | null
  computed_at: string
}

export interface TripAward {
  id: string
  trip_id: string
  award_key: string
  award_name: string
  award_description: string | null
  award_icon: string
  trip_player_id: string
  value: string | null
  computed_at: string
}

export interface PlayerRoundTee {
  id: string
  trip_player_id: string
  course_id: string
  tee_name: string
  tee_slope: number | null
  tee_rating: number | null
  tee_par: number | null
  course_handicap: number | null
  created_at: string
}

export type ScorecardColumnKey =
  | 'gross'
  | 'net'
  | 'vs_par'
  | 'skins_status'
  | 'nassau_status'
  | 'stableford_points'
  | 'game_points'
  | 'running_total'
  | 'handicap_strokes'

export interface ScorecardPreferences {
  id: string
  user_id: string
  visible_columns: ScorecardColumnKey[]
  view_mode: 'compact' | 'standard' | 'expanded'
  updated_at: string
}

// ============================================================================
// Activity Feed & Expenses Types
// ============================================================================

export type ActivityEventType =
  | 'score_posted' | 'birdie' | 'eagle' | 'skin_won'
  | 'game_result' | 'lead_change' | 'press' | 'side_bet_hit'
  | 'photo' | 'round_started' | 'round_finalized'
  | 'player_joined' | 'expense_added' | 'custom'

export interface ActivityFeedItem {
  id: string
  trip_id: string
  event_type: ActivityEventType
  trip_player_id: string | null
  course_id: string | null
  hole_id: string | null
  round_game_id: string | null
  title: string
  detail: string | null
  icon: string
  photo_url: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type ExpenseCategory = 'lodging' | 'food' | 'transport' | 'golf' | 'entertainment' | 'other'

export interface TripExpense {
  id: string
  trip_id: string
  description: string
  category: ExpenseCategory
  amount: number
  paid_by_trip_player_id: string
  split_among: string[] | null
  split_method: 'even' | 'custom'
  custom_splits: Record<string, number> | null
  receipt_url: string | null
  created_by: string | null
  created_at: string
}

// ============================================================================
// Ryder Cup / Team Competition Types
// ============================================================================

export interface TripCompetition {
  id: string
  trip_id: string
  name: string
  format: 'ryder_cup' | 'presidents_cup' | 'custom'
  team_a_id: string
  team_b_id: string
  win_points: number
  tie_points: number
  loss_points: number
  status: 'setup' | 'active' | 'completed'
  created_at: string
}

export interface CompetitionSession {
  id: string
  competition_id: string
  name: string
  session_type: 'foursomes' | 'four_ball' | 'singles' | 'custom'
  course_id: string | null
  session_order: number
  status: 'setup' | 'active' | 'completed'
  created_at: string
}

export interface CompetitionMatch {
  id: string
  session_id: string
  team_a_player_1: string
  team_a_player_2: string | null
  team_b_player_1: string
  team_b_player_2: string | null
  result: string | null
  winner: 'team_a' | 'team_b' | 'tie' | null
  points_team_a: number
  points_team_b: number
  round_game_id: string | null
  match_order: number
  status: 'pending' | 'active' | 'completed'
  created_at: string
}

// ============================================================================
// Wallet Types
// ============================================================================

// ============================================================================
// Social Engagement Types
// ============================================================================

export type ReactionEmoji = '🔥' | '👏' | '😂' | '💀' | '⛳' | '💰'

export interface ActivityReaction {
  id: string
  activity_id: string
  user_id: string
  emoji: ReactionEmoji
  created_at: string
}

export interface ActivityComment {
  id: string
  activity_id: string
  user_id: string
  content: string
  created_at: string
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  created_at: string
}

export interface TripMessage {
  id: string
  trip_id: string
  user_id: string | null
  content: string
  is_system: boolean
  created_at: string
}

export interface PlayerWallet {
  id: string
  player_a_id: string
  player_b_id: string
  balance: number
  last_trip_id: string | null
  last_updated: string
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  source_type: 'trip_settlement' | 'manual_payment' | 'adjustment'
  source_trip_id: string | null
  source_description: string | null
  amount: number
  balance_after: number
  created_at: string
}
