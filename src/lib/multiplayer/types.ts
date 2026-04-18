export type RoomStatus = "waiting" | "playing" | "finished";

export interface MultiplayerRoom {
  id: string;
  room_code: string;
  host_user_id: string;
  status: RoomStatus;
  board_seed: number | null;
  start_time: string | null;   // ISO8601 UTC
  board_type: string;
  created_at: string;
  finished_at: string | null;
}

export interface MultiplayerPlayer {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  joined_at: string;
  finished_at: string | null;
  gross_score: number | null;
  penalty_score: number | null;
  net_score: number | null;
  words_found: string[] | null;      // null until player submits
  words_penalized: string[] | null;
  is_dnf: boolean;
}

export interface SubmitPayload {
  room_id: string;
  gross_score: number;
  penalty_score: number;
  net_score: number;
  words_found: string[];
  words_penalized: string[];
}

// ── Realtime broadcast event payloads (client → client only) ──────────────────
// game_started and player_finished arrive via postgres_changes, NOT broadcast.

export interface EventPlayerJoined {
  type: "player_joined";
  player: MultiplayerPlayer;
}

export interface EventWordCountUpdate {
  type: "word_count_update";
  user_id: string;
  count: number;
}

export interface EventPlayerLeft {
  type: "player_left";
  user_id: string;
}

export interface EventCountdownStarted {
  type: "countdown_started";
}

export interface EventRoomReset {
  type: "room_reset";
}

export type MultiplayerBroadcastEvent =
  | EventPlayerJoined
  | EventWordCountUpdate
  | EventPlayerLeft
  | EventCountdownStarted
  | EventRoomReset;
