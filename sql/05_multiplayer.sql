-- Multiplayer tables for Boggle.WEB
-- this is definitely cooked but it's fine

-- ============================================================
-- ENUM
-- ============================================================
CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');

-- ============================================================
-- multiplayer_rooms
-- ============================================================
CREATE TABLE multiplayer_rooms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code     text NOT NULL UNIQUE,           -- 4-char alphanumeric, uppercase
  host_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        room_status NOT NULL DEFAULT 'waiting',
  board_seed    bigint,                           -- null until host starts
  start_time    timestamptz,                      -- null until host starts
  board_type    text NOT NULL DEFAULT 'random',
  created_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

CREATE INDEX idx_rooms_code    ON multiplayer_rooms(room_code);
CREATE INDEX idx_rooms_created ON multiplayer_rooms(created_at);
CREATE INDEX idx_rooms_status  ON multiplayer_rooms(status);

-- ============================================================
-- multiplayer_players
-- ============================================================
CREATE TABLE multiplayer_players (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username        text NOT NULL,
  display_name    text,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  gross_score     int,
  penalty_score   int,
  net_score       int,
  words_found     text[],          -- null until player submits; revealed in results
  words_penalized text[],
  is_dnf          boolean NOT NULL DEFAULT false,

  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_mp_players_room ON multiplayer_players(room_id);
CREATE INDEX idx_mp_players_user ON multiplayer_players(user_id);

-- ============================================================
-- Row Level Security
-- All mutations go through API routes using the service role key.
-- The anon key (browser) gets SELECT only.
-- ============================================================
ALTER TABLE multiplayer_rooms    ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplayer_players  ENABLE ROW LEVEL SECURITY;

-- Anyone can read rooms (needed to join by code)
CREATE POLICY "rooms_select_all" ON multiplayer_rooms
  FOR SELECT USING (true);

-- Anyone can read players (word lists are null until game ends, so safe mid-game)
CREATE POLICY "players_select_all" ON multiplayer_players
  FOR SELECT USING (true);

-- No direct client INSERT/UPDATE/DELETE — blocked by absence of write policies
-- All writes go through API routes using getSupabaseAdmin() (service role)

-- ============================================================
-- Cleanup function (called by Vercel cron + on room create)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_abandoned_rooms() RETURNS void AS $$
BEGIN
  DELETE FROM multiplayer_rooms
  WHERE status IN ('waiting', 'playing')
    AND created_at < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
