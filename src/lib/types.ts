export interface Trip {
  id: string
  name: string
  year: number
  location: string | null
  status: 'setup' | 'active' | 'completed'
  match_buy_in: number
  skins_buy_in: number
  skins_mode: 'gross' | 'net' | 'both'
  created_at: string
  updated_at: string
  created_by: string | null
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
  holes?: Hole[]
}

export interface Hole {
  id: string
  course_id: string
  hole_number: number
  par: number
  handicap_index: number
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

export type MatchFormat = Match['format']

export const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  '1v1_stroke': '1v1 Stroke Play',
  '2v2_best_ball': '2v2 Best Ball',
  '1v1_match': '1v1 Match Play',
  '2v2_alternate_shot': '2v2 Alternate Shot',
}
