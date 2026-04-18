-- Migration 06: ratings, friendships, presence + schema fixes
-- Fixes found during audit of live schema

-- ============================================================
-- FIX 1: delete_old_rooms references non-existent 'rooms' table
-- Replace with a correct no-op drop (cleanup_abandoned_rooms is
-- the live function; delete_old_rooms is a stale leftover)
-- ============================================================
DROP FUNCTION IF EXISTS public.delete_old_rooms();

-- ============================================================
-- FIX 2: Drop unused duplicate indexes (0 scans each)
-- ============================================================
-- multiplayer_rooms_room_code_key is a UNIQUE constraint (not a plain index),
-- idx_rooms_code is the explicit index covering the same column — keep both.
-- daily_challenges and password_reset_tokens unique constraints also back FKs — leave alone.
-- NOTE: keeping users_email_key for now — email lookups will be
-- needed once email-required auth ships (migration 07)

-- ============================================================
-- FIX 3: Tighten RLS on game_stats and daily_leaderboard
-- These tables had client INSERT/UPDATE policies — writes should
-- only happen via service-role API routes, not the anon client.
-- ============================================================
DROP POLICY IF EXISTS "Users can insert game stats"       ON public.game_stats;
DROP POLICY IF EXISTS "Users can update game stats"       ON public.game_stats;
DROP POLICY IF EXISTS "Users can insert leaderboard entry" ON public.daily_leaderboard;
DROP POLICY IF EXISTS "Users can update leaderboard entry" ON public.daily_leaderboard;
-- SELECT policies are intentionally kept (public leaderboard reads are fine)

-- ============================================================
-- NEW: user_ratings
-- One row per user. ELO seeded at 800.
-- Calculation algorithm deferred to a later migration.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_ratings (
  user_id    uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  rating     int  NOT NULL DEFAULT 800,
  peak       int  NOT NULL DEFAULT 800,
  games      int  NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Back-fill every existing user at 800
INSERT INTO public.user_ratings (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_select" ON public.user_ratings FOR SELECT USING (true);

-- ============================================================
-- NEW: friendships
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friendship_status') THEN
    CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       public.friendship_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT USING (true);

-- ============================================================
-- NEW: friend_presence
-- last_seen_at updated server-side on every auth'd API hit.
-- Online threshold: last_seen_at > now() - interval '3 minutes'
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friend_presence (
  user_id      uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Back-fill existing users as offline baseline
INSERT INTO public.friend_presence (user_id, last_seen_at)
SELECT id, now() - interval '1 hour' FROM public.users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.friend_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_select" ON public.friend_presence FOR SELECT USING (true);

-- Realtime is already enabled FOR ALL TABLES on this project —
-- friend_presence is automatically covered, no ALTER PUBLICATION needed.
