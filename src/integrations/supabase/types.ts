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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payments: {
        Row: {
          amount: number | null
          created_at: string
          event_id: string
          id: string
          payment_date: string
          payment_method: string
          player_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_id: string
          id?: string
          payment_date?: string
          payment_method: string
          player_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_id?: string
          id?: string
          payment_date?: string
          payment_method?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_players: {
        Row: {
          created_at: string
          event_id: string
          id: string
          order_index: number | null
          player_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          order_index?: number | null
          player_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          order_index?: number | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_players_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          club_id: string | null
          court_count: number | null
          created_at: string
          date: string
          event_type: string
          id: string
          queue_fee: number | null
          status: string
          title: string
          tournament_config: Json | null
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          court_count?: number | null
          created_at?: string
          date: string
          event_type?: string
          id?: string
          queue_fee?: number | null
          status?: string
          title: string
          tournament_config?: Json | null
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          court_count?: number | null
          created_at?: string
          date?: string
          event_type?: string
          id?: string
          queue_fee?: number | null
          status?: string
          title?: string
          tournament_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          completed: boolean | null
          court_id: number | null
          created_at: string
          event_id: string | null
          id: string
          player1_id: string
          player2_id: string
          player3_id: string
          player4_id: string
          start_time: string | null
          updated_at: string
          winner: string | null
        }
        Insert: {
          completed?: boolean | null
          court_id?: number | null
          created_at?: string
          event_id?: string | null
          id?: string
          player1_id: string
          player2_id: string
          player3_id: string
          player4_id: string
          start_time?: string | null
          updated_at?: string
          winner?: string | null
        }
        Update: {
          completed?: boolean | null
          court_id?: number | null
          created_at?: string
          event_id?: string | null
          id?: string
          player1_id?: string
          player2_id?: string
          player3_id?: string
          player4_id?: string
          start_time?: string | null
          updated_at?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birthday: string | null
          club_id: string | null
          created_at: string
          games_played: number
          id: string
          losses: number | null
          major_level: string
          name: string
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          penalty_bonus: number
          photo: string | null
          status: string
          sub_level: string | null
          total_minutes_played: number | null
          updated_at: string
          wins: number | null
        }
        Insert: {
          birthday?: string | null
          club_id?: string | null
          created_at?: string
          games_played?: number
          id?: string
          losses?: number | null
          major_level: string
          name: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          penalty_bonus?: number
          photo?: string | null
          status?: string
          sub_level?: string | null
          total_minutes_played?: number | null
          updated_at?: string
          wins?: number | null
        }
        Update: {
          birthday?: string | null
          club_id?: string | null
          created_at?: string
          games_played?: number
          id?: string
          losses?: number | null
          major_level?: string
          name?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          penalty_bonus?: number
          photo?: string | null
          status?: string
          sub_level?: string | null
          total_minutes_played?: number | null
          updated_at?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          bracket_position: string | null
          completed_time: string | null
          created_at: string
          group_id: string | null
          id: string
          match_number: number
          participant1_id: string | null
          participant1_score: number | null
          participant2_id: string | null
          participant2_score: number | null
          round_number: number
          scheduled_time: string | null
          stage: string
          status: string
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bracket_position?: string | null
          completed_time?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          match_number?: number
          participant1_id?: string | null
          participant1_score?: number | null
          participant2_id?: string | null
          participant2_score?: number | null
          round_number?: number
          scheduled_time?: string | null
          stage: string
          status?: string
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bracket_position?: string | null
          completed_time?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          match_number?: number
          participant1_id?: string | null
          participant1_score?: number | null
          participant2_id?: string | null
          participant2_score?: number | null
          round_number?: number
          scheduled_time?: string | null
          stage?: string
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          created_at: string
          eliminated_at: string | null
          final_position: number | null
          group_id: string | null
          id: string
          losses: number
          player_id: string
          points_against: number
          points_for: number
          seed_number: number | null
          tournament_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          eliminated_at?: string | null
          final_position?: number | null
          group_id?: string | null
          id?: string
          losses?: number
          player_id: string
          points_against?: number
          points_for?: number
          seed_number?: number | null
          tournament_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          eliminated_at?: string | null
          final_position?: number | null
          group_id?: string | null
          id?: string
          losses?: number
          player_id?: string
          points_against?: number
          points_for?: number
          seed_number?: number | null
          tournament_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          brackets: Json
          created_at: string
          current_stage: string
          event_id: string
          id: string
          participants: Json
          stage_config: Json
          tournament_type: string
          updated_at: string
        }
        Insert: {
          brackets?: Json
          created_at?: string
          current_stage?: string
          event_id: string
          id?: string
          participants?: Json
          stage_config?: Json
          tournament_type: string
          updated_at?: string
        }
        Update: {
          brackets?: Json
          created_at?: string
          current_stage?: string
          event_id?: string
          id?: string
          participants?: Json
          stage_config?: Json
          tournament_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_matches: {
        Row: {
          created_at: string
          event_id: string
          id: string
          match_data: Json | null
          player1_id: string
          player2_id: string
          player3_id: string
          player4_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          match_data?: Json | null
          player1_id: string
          player2_id: string
          player3_id: string
          player4_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          match_data?: Json | null
          player1_id?: string
          player2_id?: string
          player3_id?: string
          player4_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_club_ids: {
        Args: { _user_id?: string }
        Returns: string[]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id?: string }
        Returns: boolean
      }
      is_club_owner: {
        Args: { _club_id: string; _user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
