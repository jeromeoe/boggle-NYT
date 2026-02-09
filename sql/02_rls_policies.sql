-- Row Level Security Policies for Custom Auth
-- Since we're using custom username/password authentication (not Supabase Auth),
-- we need policies that don't rely on auth.uid()

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Allow anyone to insert (for registration)
CREATE POLICY "Anyone can create an account"
    ON users FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Users can view all profiles (needed for leaderboards)
CREATE POLICY "Anyone can view user profiles"
    ON users FOR SELECT
    TO anon, authenticated
    USING (true);

-- Users can update their own profile (checked in application logic)
-- This is less strict but we validate user_id in the application
CREATE POLICY "Users can update profiles"
    ON users FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- GAME STATS TABLE POLICIES
-- ============================================

-- Allow anyone to insert game stats (user_id validated in app)
CREATE POLICY "Users can insert game stats"
    ON game_stats FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow anyone to view game stats (needed for leaderboards)
CREATE POLICY "Anyone can view game stats"
    ON game_stats FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow updates (validated in application)
CREATE POLICY "Users can update game stats"
    ON game_stats FOR UPDATE
    TO anon, authenticated
    USING (true);

-- ============================================
-- DAILY CHALLENGES TABLE POLICIES
-- ============================================

-- Anyone can view daily challenges
CREATE POLICY "Anyone can view daily challenges"
    ON daily_challenges FOR SELECT
    TO authenticated, anon
    USING (true);

-- Only allow insert through application (you can restrict this further)
CREATE POLICY "Allow insert daily challenges"
    ON daily_challenges FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- ============================================
-- DAILY LEADERBOARD TABLE POLICIES
-- ============================================

-- Anyone can view leaderboard
CREATE POLICY "Anyone can view leaderboard"
    ON daily_leaderboard FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow insert (validated in app)
CREATE POLICY "Users can insert leaderboard entry"
    ON daily_leaderboard FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Allow update (validated in app)
CREATE POLICY "Users can update leaderboard entry"
    ON daily_leaderboard FOR UPDATE
    TO authenticated, anon
    USING (true);

-- ============================================
-- SECURITY NOTES
-- ============================================
-- Since we're not using Supabase Auth, RLS can't verify user identity
-- Security is enforced in the application layer:
-- 1. Password hashing with bcrypt
-- 2. Session validation in localStorage
-- 3. User ID verification in API calls (when you add them)
--
-- For production, consider:
-- 1. Adding API routes with proper session validation
-- 2. Using JWT tokens instead of localStorage
-- 3. Implementing rate limiting
-- 4. Adding more granular policies when you have proper session management
