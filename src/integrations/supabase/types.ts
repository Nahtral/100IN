export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      evaluations: {
        Row: {
          analysis_data: Json | null
          analysis_status: string
          body_alignment_score: number | null
          created_at: string
          created_by: string
          development_plan: string | null
          dribbling_score: number | null
          feedback: string | null
          foot_speed_score: number | null
          id: string
          injury_risk_level: string | null
          movement_score: number | null
          passing_score: number | null
          player_id: string
          shooting_score: number | null
          updated_at: string
          vertical_jump_score: number | null
          video_filename: string
          video_size_mb: number
          video_url: string
        }
        Insert: {
          analysis_data?: Json | null
          analysis_status?: string
          body_alignment_score?: number | null
          created_at?: string
          created_by: string
          development_plan?: string | null
          dribbling_score?: number | null
          feedback?: string | null
          foot_speed_score?: number | null
          id?: string
          injury_risk_level?: string | null
          movement_score?: number | null
          passing_score?: number | null
          player_id: string
          shooting_score?: number | null
          updated_at?: string
          vertical_jump_score?: number | null
          video_filename: string
          video_size_mb: number
          video_url: string
        }
        Update: {
          analysis_data?: Json | null
          analysis_status?: string
          body_alignment_score?: number | null
          created_at?: string
          created_by?: string
          development_plan?: string | null
          dribbling_score?: number | null
          feedback?: string | null
          foot_speed_score?: number | null
          id?: string
          injury_risk_level?: string | null
          movement_score?: number | null
          passing_score?: number | null
          player_id?: string
          shooting_score?: number | null
          updated_at?: string
          vertical_jump_score?: number | null
          video_filename?: string
          video_size_mb?: number
          video_url?: string
        }
        Relationships: []
      }
      health_wellness: {
        Row: {
          body_fat_percentage: number | null
          created_at: string | null
          created_by: string
          date: string
          fitness_score: number | null
          id: string
          injury_description: string | null
          injury_status: string | null
          medical_notes: string | null
          player_id: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string | null
          created_by: string
          date: string
          fitness_score?: number | null
          id?: string
          injury_description?: string | null
          injury_status?: string | null
          medical_notes?: string | null
          player_id: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string | null
          created_by?: string
          date?: string
          fitness_score?: number | null
          id?: string
          injury_description?: string | null
          injury_status?: string | null
          medical_notes?: string | null
          player_id?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_wellness_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      news_updates: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string | null
          id: string
          priority: string
          published_at: string | null
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          created_at?: string | null
          id?: string
          priority?: string
          published_at?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          priority?: string
          published_at?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_updates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_child_relationships: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
          relationship_type: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
          relationship_type: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
          relationship_type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          payer_id: string | null
          payment_date: string
          payment_status: string
          payment_type: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          payer_id?: string | null
          payment_date?: string
          payment_status?: string
          payment_type: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          payer_id?: string | null
          payment_date?: string
          payment_status?: string
          payment_type?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_attendance: {
        Row: {
          created_at: string
          id: string
          marked_at: string
          marked_by: string
          notes: string | null
          player_id: string
          schedule_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by: string
          notes?: string | null
          player_id: string
          schedule_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string
          notes?: string | null
          player_id?: string
          schedule_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_attendance_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      player_performance: {
        Row: {
          assists: number | null
          blocks: number | null
          created_at: string | null
          field_goals_attempted: number | null
          field_goals_made: number | null
          free_throws_attempted: number | null
          free_throws_made: number | null
          game_date: string
          id: string
          minutes_played: number | null
          opponent: string | null
          player_id: string
          points: number | null
          rebounds: number | null
          steals: number | null
          turnovers: number | null
          updated_at: string | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          created_at?: string | null
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          game_date: string
          id?: string
          minutes_played?: number | null
          opponent?: string | null
          player_id: string
          points?: number | null
          rebounds?: number | null
          steals?: number | null
          turnovers?: number | null
          updated_at?: string | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          created_at?: string | null
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          game_date?: string
          id?: string
          minutes_played?: number | null
          opponent?: string | null
          player_id?: string
          points?: number | null
          rebounds?: number | null
          steals?: number | null
          turnovers?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_performance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          height: string | null
          id: string
          is_active: boolean
          jersey_number: number | null
          medical_notes: string | null
          position: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
          weight: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height?: string | null
          id?: string
          is_active?: boolean
          jersey_number?: number | null
          medical_notes?: string | null
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
          weight?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height?: string | null
          id?: string
          is_active?: boolean
          jersey_number?: number | null
          medical_notes?: string | null
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string
          event_type: string
          id: string
          is_recurring: boolean | null
          location: string
          opponent: string | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          start_time: string
          team_ids: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          is_recurring?: boolean | null
          location: string
          opponent?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          start_time: string
          team_ids?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          location?: string
          opponent?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          start_time?: string
          team_ids?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string
          created_by: string | null
          id: string
          is_resolved: boolean
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: number
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_resolved?: boolean
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_resolved?: boolean
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_attendance: {
        Row: {
          absent_count: number
          attendance_percentage: number
          created_at: string
          excused_count: number
          id: string
          late_count: number
          present_count: number
          schedule_id: string
          team_id: string
          total_players: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          absent_count?: number
          attendance_percentage?: number
          created_at?: string
          excused_count?: number
          id?: string
          late_count?: number
          present_count?: number
          schedule_id: string
          team_id: string
          total_players?: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          absent_count?: number
          attendance_percentage?: number
          created_at?: string
          excused_count?: number
          id?: string
          late_count?: number
          present_count?: number
          schedule_id?: string
          team_id?: string
          total_players?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_attendance_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          age_group: string
          coach_id: string | null
          created_at: string | null
          id: string
          name: string
          season: string
          updated_at: string | null
        }
        Insert: {
          age_group: string
          coach_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          season: string
          updated_at?: string | null
        }
        Update: {
          age_group?: string
          coach_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          season?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "super_admin"
        | "staff"
        | "coach"
        | "player"
        | "parent"
        | "medical"
        | "partner"
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
    Enums: {
      user_role: [
        "super_admin",
        "staff",
        "coach",
        "player",
        "parent",
        "medical",
        "partner",
      ],
    },
  },
} as const
