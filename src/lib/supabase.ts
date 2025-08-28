import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface User {
  id: string
  name: string
  email: string
  phone_number?: string
  gender?: string
  preferred_latitude?: number
  preferred_longitude?: number
  travel_radius_km?: number
  location_text?: string
  profile_picture_url?: string
  profile_picture_updated_at?: string
  created_at: string
}

export interface Ladder {
  id: string
  name: string
  type: 'competitive' | 'casual' | 'women'
  fee: number
  created_at: string
}

export interface LadderMembership {
  id: string
  user_id: string
  ladder_id: string
  join_date: string
  current_rank?: number
  is_active: boolean
  winning_streak: number
  trend: 'up' | 'down' | 'none'
}

export interface Match {
  id: string
  week: number
  player1_id: string
  player2_id: string
  player1_score?: string
  player2_score?: string
  played_at?: string
  status: 'scheduled' | 'completed' | 'pending'
  player1_score_submitted_by?: string
  player2_score_submitted_by?: string
  player1_score_submitted_at?: string
  player2_score_submitted_at?: string
  player1_score_submitted?: string
  player2_score_submitted?: string
  player1_score_string?: string
  player2_score_string?: string
  player1_winner_submitted?: string
  player2_winner_submitted?: string
}

export interface Payment {
  id: string
  user_id: string
  ladder_id: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  paid_at?: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  ladder_id?: string
  is_template: boolean
  template_vars?: Record<string, string>
  created_at: string
  is_active: boolean
} 