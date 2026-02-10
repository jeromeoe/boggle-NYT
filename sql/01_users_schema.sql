-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (username/password auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE, -- Optional, for password reset only
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Game statistics table
CREATE TABLE IF NOT EXISTS game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_date DATE DEFAULT CURRENT_DATE,
    gross_score INTEGER DEFAULT 0,
    penalty_score INTEGER DEFAULT 0,
    net_score INTEGER DEFAULT 0,
    words_found TEXT[], -- Array of found words
    words_penalized TEXT[], -- Array of penalized words
    total_possible_words INTEGER,
    duration_seconds INTEGER,
    board_state JSONB, -- Store the 4x4 board
    is_daily_challenge BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_date DATE UNIQUE NOT NULL,
    board_seed INTEGER NOT NULL, -- Seed for deterministic board generation
    board_state JSONB NOT NULL,
    total_possible_words INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard view for daily challenges
CREATE TABLE IF NOT EXISTS daily_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_date DATE,
    gross_score INTEGER,
    net_score INTEGER,
    rank INTEGER,
    words_found INTEGER,
    completion_time_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_date)
);

-- Indexes for performance
CREATE INDEX idx_game_stats_user_id ON game_stats(user_id);
CREATE INDEX idx_game_stats_date ON game_stats(game_date);
CREATE INDEX idx_daily_leaderboard_date ON daily_leaderboard(challenge_date);
CREATE INDEX idx_daily_leaderboard_score ON daily_leaderboard(net_score DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_leaderboard ENABLE ROW LEVEL SECURITY;
