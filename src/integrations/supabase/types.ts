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
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          chat_type: string
          created_at: string
          created_by: string
          id: string
          name: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          chat_type: string
          created_at?: string
          created_by: string
          id?: string
          name?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          chat_type?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_health_checkins: {
        Row: {
          additional_notes: string | null
          check_in_date: string
          created_at: string
          energy_level: number | null
          hydration_level: number | null
          id: string
          medication_taken: string | null
          mood: number | null
          nutrition_quality: number | null
          overall_mood: string | null
          pain_level: number | null
          pain_location: string | null
          player_id: string
          sleep_hours: number | null
          sleep_quality: number | null
          soreness_areas: string[] | null
          soreness_level: number | null
          stress_level: number | null
          symptoms: string[] | null
          training_readiness: number | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          check_in_date?: string
          created_at?: string
          energy_level?: number | null
          hydration_level?: number | null
          id?: string
          medication_taken?: string | null
          mood?: number | null
          nutrition_quality?: number | null
          overall_mood?: string | null
          pain_level?: number | null
          pain_location?: string | null
          player_id: string
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness_areas?: string[] | null
          soreness_level?: number | null
          stress_level?: number | null
          symptoms?: string[] | null
          training_readiness?: number | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          check_in_date?: string
          created_at?: string
          energy_level?: number | null
          hydration_level?: number | null
          id?: string
          medication_taken?: string | null
          mood?: number | null
          nutrition_quality?: number | null
          overall_mood?: string | null
          pain_level?: number | null
          pain_location?: string | null
          player_id?: string
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness_areas?: string[] | null
          soreness_level?: number | null
          stress_level?: number | null
          symptoms?: string[] | null
          training_readiness?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_preferences: {
        Row: {
          created_at: string
          id: string
          layout_preferences: Json | null
          theme_preferences: Json | null
          updated_at: string
          user_id: string
          widget_preferences: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          layout_preferences?: Json | null
          theme_preferences?: Json | null
          updated_at?: string
          user_id: string
          widget_preferences?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          layout_preferences?: Json | null
          theme_preferences?: Json | null
          updated_at?: string
          user_id?: string
          widget_preferences?: Json | null
        }
        Relationships: []
      }
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
      injury_reports: {
        Row: {
          created_at: string
          date_occurred: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          injury_description: string
          injury_location: string
          injury_type: string
          medical_clearance_received: boolean | null
          medical_clearance_required: boolean | null
          player_id: string
          reported_by: string
          return_to_play_date: string | null
          severity_level: string
          status: string
          symptoms: string[] | null
          treatment_received: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_occurred: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          injury_description: string
          injury_location: string
          injury_type: string
          medical_clearance_received?: boolean | null
          medical_clearance_required?: boolean | null
          player_id: string
          reported_by: string
          return_to_play_date?: string | null
          severity_level: string
          status?: string
          symptoms?: string[] | null
          treatment_received?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_occurred?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          injury_description?: string
          injury_location?: string
          injury_type?: string
          medical_clearance_received?: boolean | null
          medical_clearance_required?: boolean | null
          player_id?: string
          reported_by?: string
          return_to_play_date?: string | null
          severity_level?: string
          status?: string
          symptoms?: string[] | null
          treatment_received?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media_uploads: {
        Row: {
          created_at: string
          dimensions: Json | null
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id: string
          media_type: string
          news_id: string | null
          orientation: string | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          dimensions?: Json | null
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id?: string
          media_type: string
          news_id?: string | null
          orientation?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          dimensions?: Json | null
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          file_url?: string
          id?: string
          media_type?: string
          news_id?: string | null
          orientation?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_uploads_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_appointments: {
        Row: {
          appointment_date: string
          appointment_type: string
          created_at: string
          created_by: string
          duration_minutes: number | null
          follow_up_required: boolean | null
          id: string
          location: string | null
          next_appointment_date: string | null
          notes: string | null
          outcome: string | null
          player_id: string
          provider_name: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_type: string
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          next_appointment_date?: string | null
          notes?: string | null
          outcome?: string | null
          player_id: string
          provider_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          next_appointment_date?: string | null
          notes?: string | null
          outcome?: string | null
          player_id?: string
          provider_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_communications: {
        Row: {
          communication_type: string
          created_at: string
          id: string
          is_read_by: Json | null
          message: string
          priority: string
          recipient_ids: string[] | null
          recipient_type: string
          related_player_id: string | null
          sender_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          communication_type: string
          created_at?: string
          id?: string
          is_read_by?: Json | null
          message: string
          priority?: string
          recipient_ids?: string[] | null
          recipient_type: string
          related_player_id?: string | null
          sender_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          communication_type?: string
          created_at?: string
          id?: string
          is_read_by?: Json | null
          message?: string
          priority?: string
          recipient_ids?: string[] | null
          recipient_type?: string
          related_player_id?: string | null
          sender_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          id: string
          media_size: number | null
          media_type: string | null
          media_url: string | null
          message_type: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          id?: string
          media_size?: number | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          id?: string
          media_size?: number | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
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
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          media_urls: string[] | null
          priority: string
          published_at: string | null
          tags: string[] | null
          team_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          media_urls?: string[] | null
          priority?: string
          published_at?: string | null
          tags?: string[] | null
          team_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          media_urls?: string[] | null
          priority?: string
          published_at?: string | null
          tags?: string[] | null
          team_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
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
      partner_organizations: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          partnership_status: string
          partnership_type: string
          partnership_value: number | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          partnership_status?: string
          partnership_type?: string
          partnership_value?: number | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          partnership_status?: string
          partnership_type?: string
          partnership_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_user_relationships: {
        Row: {
          created_at: string
          id: string
          is_primary_contact: boolean | null
          partner_organization_id: string
          role_in_organization: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          partner_organization_id: string
          role_in_organization?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          partner_organization_id?: string
          role_in_organization?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_user_relationships_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
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
      rehabilitation_plans: {
        Row: {
          actual_completion_date: string | null
          assigned_by: string
          created_at: string
          exercises: Json | null
          id: string
          injury_report_id: string | null
          plan_description: string | null
          plan_title: string
          player_id: string
          progress_notes: string | null
          start_date: string
          status: string
          target_completion_date: string | null
          updated_at: string
        }
        Insert: {
          actual_completion_date?: string | null
          assigned_by: string
          created_at?: string
          exercises?: Json | null
          id?: string
          injury_report_id?: string | null
          plan_description?: string | null
          plan_title: string
          player_id: string
          progress_notes?: string | null
          start_date: string
          status?: string
          target_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_completion_date?: string | null
          assigned_by?: string
          created_at?: string
          exercises?: Json | null
          id?: string
          injury_report_id?: string | null
          plan_description?: string | null
          plan_title?: string
          player_id?: string
          progress_notes?: string | null
          start_date?: string
          status?: string
          target_completion_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehabilitation_plans_injury_report_id_fkey"
            columns: ["injury_report_id"]
            isOneToOne: false
            referencedRelation: "injury_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_role: string
          old_role: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_role: string
          old_role?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_role?: string
          old_role?: string | null
          reason?: string | null
          user_id?: string
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
      staff_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
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
