export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      daily_challenges: {
        Row: {
          board_seed: number
          board_state: Json
          challenge_date: string
          created_at: string | null
          id: string
          total_possible_words: number | null
        }
        Insert: {
          board_seed: number
          board_state: Json
          challenge_date: string
          created_at?: string | null
          id?: string
          total_possible_words?: number | null
        }
        Update: {
          board_seed?: number
          board_state?: Json
          challenge_date?: string
          created_at?: string | null
          id?: string
          total_possible_words?: number | null
        }
        Relationships: []
      }
      daily_leaderboard: {
        Row: {
          challenge_date: string | null
          completion_time_seconds: number | null
          created_at: string | null
          gross_score: number | null
          id: string
          net_score: number | null
          rank: number | null
          user_id: string | null
          words_found: number | null
        }
        Insert: {
          challenge_date?: string | null
          completion_time_seconds?: number | null
          created_at?: string | null
          gross_score?: number | null
          id?: string
          net_score?: number | null
          rank?: number | null
          user_id?: string | null
          words_found?: number | null
        }
        Update: {
          challenge_date?: string | null
          completion_time_seconds?: number | null
          created_at?: string | null
          gross_score?: number | null
          id?: string
          net_score?: number | null
          rank?: number | null
          user_id?: string | null
          words_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_presence: {
        Row: {
          last_seen_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_stats: {
        Row: {
          board_state: Json | null
          created_at: string | null
          duration_seconds: number | null
          game_date: string | null
          gross_score: number | null
          id: string
          is_daily_challenge: boolean | null
          net_score: number | null
          penalty_score: number | null
          total_possible_words: number | null
          user_id: string | null
          words_found: string[] | null
          words_penalized: string[] | null
        }
        Insert: {
          board_state?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          game_date?: string | null
          gross_score?: number | null
          id?: string
          is_daily_challenge?: boolean | null
          net_score?: number | null
          penalty_score?: number | null
          total_possible_words?: number | null
          user_id?: string | null
          words_found?: string[] | null
          words_penalized?: string[] | null
        }
        Update: {
          board_state?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          game_date?: string | null
          gross_score?: number | null
          id?: string
          is_daily_challenge?: boolean | null
          net_score?: number | null
          penalty_score?: number | null
          total_possible_words?: number | null
          user_id?: string | null
          words_found?: string[] | null
          words_penalized?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "game_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_players: {
        Row: {
          display_name: string | null
          finished_at: string | null
          gross_score: number | null
          id: string
          is_dnf: boolean
          joined_at: string
          net_score: number | null
          penalty_score: number | null
          room_id: string
          user_id: string
          username: string
          words_found: string[] | null
          words_penalized: string[] | null
        }
        Insert: {
          display_name?: string | null
          finished_at?: string | null
          gross_score?: number | null
          id?: string
          is_dnf?: boolean
          joined_at?: string
          net_score?: number | null
          penalty_score?: number | null
          room_id: string
          user_id: string
          username: string
          words_found?: string[] | null
          words_penalized?: string[] | null
        }
        Update: {
          display_name?: string | null
          finished_at?: string | null
          gross_score?: number | null
          id?: string
          is_dnf?: boolean
          joined_at?: string
          net_score?: number | null
          penalty_score?: number | null
          room_id?: string
          user_id?: string
          username?: string
          words_found?: string[] | null
          words_penalized?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_rooms: {
        Row: {
          board_seed: number | null
          board_type: string
          created_at: string
          finished_at: string | null
          host_user_id: string
          id: string
          room_code: string
          start_time: string | null
          status: Database["public"]["Enums"]["room_status"]
        }
        Insert: {
          board_seed?: number | null
          board_type?: string
          created_at?: string
          finished_at?: string | null
          host_user_id: string
          id?: string
          room_code: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["room_status"]
        }
        Update: {
          board_seed?: number | null
          board_type?: string
          created_at?: string
          finished_at?: string | null
          host_user_id?: string
          id?: string
          room_code?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["room_status"]
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_rooms_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ratings: {
        Row: {
          games: number
          peak: number
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          games?: number
          peak?: number
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          games?: number
          peak?: number
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          last_login: string | null
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_abandoned_rooms: { Args: never; Returns: undefined }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_net_score: number
          best_score: number
          days_played: number
          total_games: number
          total_words_found: number
        }[]
      }
      update_leaderboard_ranks: { Args: never; Returns: undefined }
    }
    Enums: {
      friendship_status: "pending" | "accepted" | "blocked"
      room_status: "waiting" | "playing" | "finished"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      friendship_status: ["pending", "accepted", "blocked"],
      room_status: ["waiting", "playing", "finished"],
    },
  },
} as const
