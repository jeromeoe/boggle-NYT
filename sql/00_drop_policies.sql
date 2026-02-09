-- IMPORTANT: Run this if you already created the old RLS policies
-- This will drop all existing policies and allow you to run 02_rls_policies.sql fresh

-- Drop old policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can create an account" ON users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;
DROP POLICY IF EXISTS "Users can update profiles" ON users;

-- Drop old policies on game_stats table
DROP POLICY IF EXISTS "Users can view own game stats" ON game_stats;
DROP POLICY IF EXISTS "Users can insert own game stats" ON game_stats;
DROP POLICY IF EXISTS "Users can update own game stats" ON game_stats;
DROP POLICY IF EXISTS "Users can insert game stats" ON game_stats;
DROP POLICY IF EXISTS "Anyone can view game stats" ON game_stats;
DROP POLICY IF EXISTS "Users can update game stats" ON game_stats;

-- Drop old policies on daily_challenges table
DROP POLICY IF EXISTS "Anyone can view daily challenges" ON daily_challenges;
DROP POLICY IF EXISTS "Allow insert daily challenges" ON daily_challenges;

-- Drop old policies on daily_leaderboard table
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON daily_leaderboard;
DROP POLICY IF EXISTS "Users can insert own leaderboard entry" ON daily_leaderboard;
DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON daily_leaderboard;
DROP POLICY IF EXISTS "Users can insert leaderboard entry" ON daily_leaderboard;
DROP POLICY IF EXISTS "Users can update leaderboard entry" ON daily_leaderboard;
