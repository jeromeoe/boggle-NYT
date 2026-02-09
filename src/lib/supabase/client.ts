import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface User {
    id: string;
    username: string;
    email?: string;
    display_name?: string;
    created_at: string;
    last_login?: string;
}

export interface GameStats {
    id: string;
    user_id: string;
    game_date: string;
    gross_score: number;
    penalty_score: number;
    net_score: number;
    words_found: string[];
    words_penalized: string[];
    total_possible_words: number;
    duration_seconds: number;
    board_state: string[][];
    is_daily_challenge: boolean;
    created_at: string;
}

export interface DailyChallenge {
    id: string;
    challenge_date: string;
    board_seed: number;
    board_state: string[][];
    total_possible_words: number;
    created_at: string;
}

export interface LeaderboardEntry {
    id: string;
    user_id: string;
    challenge_date: string;
    net_score: number;
    rank: number;
    words_found: number;
    completion_time_seconds: number;
    username?: string; // Joined from users table
    display_name?: string; // Joined from users table
}
