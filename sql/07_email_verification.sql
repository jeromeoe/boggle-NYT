-- Migration 07: Email verification columns + user_daily_stats

-- ============================================================
-- Part A: Email verification on users table
-- email is already nullable (migration 06 note). We add:
--   email_verified_at       — stamped when user clicks the link
--   email_verification_token — plaintext token stored temporarily (cleared after use)
--   email_verification_expires — expiry timestamp for the token
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified_at        timestamptz,
  ADD COLUMN IF NOT EXISTS email_verification_token text,
  ADD COLUMN IF NOT EXISTS email_verification_expires timestamptz;

-- ============================================================
-- Part B: user_daily_stats
-- One row per user. Aggregates across all daily challenge plays.
-- medal_counts tracks Bronze/Silver/Gold/Platinum earned.
-- streak_freeze_available resets to 1 at 7-day milestone, used automatically.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_daily_stats (
  user_id                uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

  -- Streak
  current_streak         int  NOT NULL DEFAULT 0,
  best_streak            int  NOT NULL DEFAULT 0,
  last_daily_date        date,                        -- last UTC date a daily was completed
  streak_freeze_available int NOT NULL DEFAULT 0,     -- 0 or 1

  -- Aggregate play counts
  games_played           int  NOT NULL DEFAULT 0,

  -- Best performance
  best_net_score         int  NOT NULL DEFAULT 0,
  best_gross_score       int  NOT NULL DEFAULT 0,

  -- Medal tallies (lifetime)
  bronze_medals          int  NOT NULL DEFAULT 0,
  silver_medals          int  NOT NULL DEFAULT 0,
  gold_medals            int  NOT NULL DEFAULT 0,
  platinum_medals        int  NOT NULL DEFAULT 0,
  participation_medals   int  NOT NULL DEFAULT 0,

  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Back-fill every existing user with a zero-row
INSERT INTO public.user_daily_stats (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.user_daily_stats ENABLE ROW LEVEL SECURITY;
-- Public SELECT so leaderboard/profile can read; writes only via service-role API routes
CREATE POLICY "daily_stats_select" ON public.user_daily_stats FOR SELECT USING (true);

-- ============================================================
-- Part C: Index for leaderboard queries on streak/score
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_daily_stats_streak ON public.user_daily_stats(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_best   ON public.user_daily_stats(best_net_score DESC);
