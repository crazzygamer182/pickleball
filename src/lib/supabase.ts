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
  sport: string
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

// Pickleball-specific types
export interface PickleballLadder {
  id: string
  name: string
  type: 'competitive' | 'casual' | 'women'
  sport: string
  fee: number
  created_at: string
}

export interface PickleballLadderMembership {
  id: string
  user_id: string
  ladder_id: string
  join_date: string
  current_rank?: number
  is_active: boolean
  winning_streak: number
  trend: 'up' | 'down' | 'none'
  partner?: string[]
}

export interface PickleballMatch {
  id: string
  week: number
  // Team 1 (2 players)
  team1_player1_id: string
  team1_player2_id: string
  // Team 2 (2 players)
  team2_player1_id: string
  team2_player2_id: string
  // Match details
  played_at?: string
  status: 'scheduled' | 'completed' | 'pending'
  // Team scoring (not individual)
  team1_score?: string
  team2_score?: string
  team1_score_submitted_by?: string
  team2_score_submitted_by?: string
  team1_score_submitted_at?: string
  team2_score_submitted_at?: string
  team1_winner_submitted?: 'team1' | 'team2' | null
  team2_winner_submitted?: 'team1' | 'team2' | null
  created_at: string
}

// Extended interface for frontend with player data
export interface PickleballMatchWithPlayers extends PickleballMatch {
  team1_player1: User
  team1_player2: User
  team2_player1: User
  team2_player2: User
}

export interface PickleballPayment {
  id: string
  user_id: string
  ladder_id: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  paid_at?: string
}

// Helper functions for doubles matches
export const getTeamForUser = (match: PickleballMatchWithPlayers, userId: string): 'team1' | 'team2' | null => {
  if (match.team1_player1_id === userId || match.team1_player2_id === userId) {
    return 'team1';
  }
  if (match.team2_player1_id === userId || match.team2_player2_id === userId) {
    return 'team2';
  }
  return null;
};

export const getPartnerForUser = (match: PickleballMatchWithPlayers, userId: string): User | null => {
  const userTeam = getTeamForUser(match, userId);
  if (userTeam === 'team1') {
    return match.team1_player1_id === userId ? match.team1_player2 : match.team1_player1;
  } else if (userTeam === 'team2') {
    return match.team2_player1_id === userId ? match.team2_player2 : match.team2_player1;
  }
  return null;
};

export const getOpposingTeam = (match: PickleballMatchWithPlayers, userId: string): User[] => {
  const userTeam = getTeamForUser(match, userId);
  if (userTeam === 'team1') {
    return [match.team2_player1, match.team2_player2];
  } else if (userTeam === 'team2') {
    return [match.team1_player1, match.team1_player2];
  }
  return [];
}; 