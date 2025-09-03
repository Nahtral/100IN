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
      benefit_plans: {
        Row: {
          coverage_details: Json | null
          created_at: string
          created_by: string
          description: string | null
          effective_date: string
          eligibility_requirements: Json | null
          employee_contribution_percentage: number | null
          employer_contribution_percentage: number | null
          end_date: string | null
          id: string
          is_active: boolean
          monthly_cost: number | null
          name: string
          plan_type: string
          provider_name: string | null
          updated_at: string
        }
        Insert: {
          coverage_details?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          effective_date: string
          eligibility_requirements?: Json | null
          employee_contribution_percentage?: number | null
          employer_contribution_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number | null
          name: string
          plan_type: string
          provider_name?: string | null
          updated_at?: string
        }
        Update: {
          coverage_details?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          effective_date?: string
          eligibility_requirements?: Json | null
          employee_contribution_percentage?: number | null
          employer_contribution_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number | null
          name?: string
          plan_type?: string
          provider_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      benefit_reports: {
        Row: {
          file_url: string | null
          generated_at: string
          generated_by: string
          id: string
          parameters: Json | null
          report_data: Json
          report_name: string
          report_period_end: string | null
          report_period_start: string | null
          report_type: string
        }
        Insert: {
          file_url?: string | null
          generated_at?: string
          generated_by: string
          id?: string
          parameters?: Json | null
          report_data: Json
          report_name: string
          report_period_end?: string | null
          report_period_start?: string | null
          report_type: string
        }
        Update: {
          file_url?: string | null
          generated_at?: string
          generated_by?: string
          id?: string
          parameters?: Json | null
          report_data?: Json
          report_name?: string
          report_period_end?: string | null
          report_period_start?: string | null
          report_type?: string
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
          {
            foreignKeyName: "fk_chat_participants_chat_id"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          chat_type: string
          created_at: string
          created_by: string
          id: string
          is_archived: boolean | null
          is_muted: boolean | null
          is_pinned: boolean | null
          last_read_at: string | null
          name: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          chat_type: string
          created_at?: string
          created_by: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_read_at?: string | null
          name?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          chat_type?: string
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_read_at?: string | null
          name?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assignment_type: string
          coach_id: string
          created_at: string
          id: string
          player_id: string | null
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assignment_type?: string
          coach_id: string
          created_at?: string
          id?: string
          player_id?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assignment_type?: string
          coach_id?: string
          created_at?: string
          id?: string
          player_id?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      development_goals: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          current_display: string | null
          current_value: number
          goal_type: string
          id: string
          is_active: boolean | null
          metric_name: string
          notes: string | null
          player_id: string
          priority: number | null
          progress_percentage: number | null
          target_display: string | null
          target_value: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          current_display?: string | null
          current_value: number
          goal_type: string
          id?: string
          is_active?: boolean | null
          metric_name: string
          notes?: string | null
          player_id: string
          priority?: number | null
          progress_percentage?: number | null
          target_display?: string | null
          target_value: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          current_display?: string | null
          current_value?: number
          goal_type?: string
          id?: string
          is_active?: boolean | null
          metric_name?: string
          notes?: string | null
          player_id?: string
          priority?: number | null
          progress_percentage?: number | null
          target_display?: string | null
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      drill_messages: {
        Row: {
          created_at: string
          drill_type: string
          id: string
          is_read: boolean
          message: string
          message_type: string
          player_id: string
          priority: string
          session_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          drill_type: string
          id?: string
          is_read?: boolean
          message: string
          message_type?: string
          player_id: string
          priority?: string
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          drill_type?: string
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string
          player_id?: string
          priority?: string
          session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      drill_plans: {
        Row: {
          ai_recommended: boolean | null
          assigned_by: string
          based_on_evaluation_id: string | null
          category: string
          completion_percentage: number | null
          created_at: string
          difficulty_level: string
          duration_minutes: number
          exercises: Json | null
          focus_areas: string[] | null
          id: string
          notes: string | null
          plan_name: string
          player_id: string
          progress_tracking: Json | null
          status: string
          success_criteria: string | null
          updated_at: string
        }
        Insert: {
          ai_recommended?: boolean | null
          assigned_by: string
          based_on_evaluation_id?: string | null
          category: string
          completion_percentage?: number | null
          created_at?: string
          difficulty_level: string
          duration_minutes?: number
          exercises?: Json | null
          focus_areas?: string[] | null
          id?: string
          notes?: string | null
          plan_name: string
          player_id: string
          progress_tracking?: Json | null
          status?: string
          success_criteria?: string | null
          updated_at?: string
        }
        Update: {
          ai_recommended?: boolean | null
          assigned_by?: string
          based_on_evaluation_id?: string | null
          category?: string
          completion_percentage?: number | null
          created_at?: string
          difficulty_level?: string
          duration_minutes?: number
          exercises?: Json | null
          focus_areas?: string[] | null
          id?: string
          notes?: string | null
          plan_name?: string
          player_id?: string
          progress_tracking?: Json | null
          status?: string
          success_criteria?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_benefit_enrollments: {
        Row: {
          benefit_plan_id: string
          created_at: string
          created_by: string
          dependent_coverage: Json | null
          effective_date: string
          employee_contribution: number | null
          employee_id: string
          employer_contribution: number | null
          enrollment_date: string
          enrollment_method: string | null
          id: string
          status: string
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          benefit_plan_id: string
          created_at?: string
          created_by: string
          dependent_coverage?: Json | null
          effective_date: string
          employee_contribution?: number | null
          employee_id: string
          employer_contribution?: number | null
          enrollment_date: string
          enrollment_method?: string | null
          id?: string
          status?: string
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          benefit_plan_id?: string
          created_at?: string
          created_by?: string
          dependent_coverage?: Json | null
          effective_date?: string
          employee_contribution?: number | null
          employee_id?: string
          employer_contribution?: number | null
          enrollment_date?: string
          enrollment_method?: string | null
          id?: string
          status?: string
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefit_enrollments_benefit_plan_id_fkey"
            columns: ["benefit_plan_id"]
            isOneToOne: false
            referencedRelation: "benefit_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefit_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_benefits: {
        Row: {
          benefit_type: string
          coverage_end_date: string | null
          coverage_start_date: string
          created_at: string
          dependents: Json | null
          employee_contribution: number | null
          employee_id: string
          employer_contribution: number | null
          id: string
          plan_name: string
          status: string
          updated_at: string
        }
        Insert: {
          benefit_type: string
          coverage_end_date?: string | null
          coverage_start_date: string
          created_at?: string
          dependents?: Json | null
          employee_contribution?: number | null
          employee_id: string
          employer_contribution?: number | null
          id?: string
          plan_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          benefit_type?: string
          coverage_end_date?: string | null
          coverage_start_date?: string
          created_at?: string
          dependents?: Json | null
          employee_contribution?: number | null
          employee_id?: string
          employer_contribution?: number | null
          id?: string
          plan_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          employee_id: string
          expiry_date: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          is_confidential: boolean | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          employee_id: string
          expiry_date?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_confidential?: boolean | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_confidential?: boolean | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          break_duration_minutes: number | null
          created_at: string
          created_by: string
          employee_id: string
          end_time: string
          id: string
          location: string | null
          notes: string | null
          shift_date: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          break_duration_minutes?: number | null
          created_at?: string
          created_by: string
          employee_id: string
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          shift_date: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          break_duration_minutes?: number | null
          created_at?: string
          created_by?: string
          employee_id?: string
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          shift_date?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: Json | null
          benefits_eligible: boolean | null
          created_at: string
          created_by: string
          department: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string
          employment_status: string
          first_name: string
          hire_date: string
          hourly_rate: number | null
          id: string
          last_name: string
          manager_id: string | null
          payment_type: string
          phone: string | null
          position: string
          salary: number | null
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          benefits_eligible?: boolean | null
          created_at?: string
          created_by: string
          department?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id: string
          employment_status?: string
          first_name: string
          hire_date: string
          hourly_rate?: number | null
          id?: string
          last_name: string
          manager_id?: string | null
          payment_type?: string
          phone?: string | null
          position: string
          salary?: number | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          benefits_eligible?: boolean | null
          created_at?: string
          created_by?: string
          department?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string
          employment_status?: string
          first_name?: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          last_name?: string
          manager_id?: string | null
          payment_type?: string
          phone?: string | null
          position?: string
          salary?: number | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          severity: string | null
          stack: string | null
          url: string
          user_agent: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          severity?: string | null
          stack?: string | null
          url: string
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          severity?: string | null
          stack?: string | null
          url?: string
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
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
      game_log_ai_jobs: {
        Row: {
          ai_response: Json | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string | null
          error_message: string | null
          game_log_id: string | null
          id: string
          screenshot_url: string
          status: string | null
        }
        Insert: {
          ai_response?: Json | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          game_log_id?: string | null
          id?: string
          screenshot_url: string
          status?: string | null
        }
        Update: {
          ai_response?: Json | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          game_log_id?: string | null
          id?: string
          screenshot_url?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_log_ai_jobs_game_log_id_fkey"
            columns: ["game_log_id"]
            isOneToOne: false
            referencedRelation: "game_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      game_logs: {
        Row: {
          ai_confidence: number | null
          ai_processed: boolean | null
          assists: number | null
          blocks: number | null
          created_at: string
          created_by: string
          field_goals_attempted: number | null
          field_goals_made: number | null
          free_throws_attempted: number | null
          free_throws_made: number | null
          game_date: string
          game_rating: number | null
          id: string
          minutes_played: number | null
          opponent: string
          performance_notes: string | null
          player_id: string
          plus_minus: number | null
          points: number | null
          raw_ai_data: Json | null
          rebounds: number | null
          result: string
          screenshot_url: string | null
          steals: number | null
          three_points_attempted: number | null
          three_points_made: number | null
          turnovers: number | null
          updated_at: string
          upload_method: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_processed?: boolean | null
          assists?: number | null
          blocks?: number | null
          created_at?: string
          created_by: string
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          game_date: string
          game_rating?: number | null
          id?: string
          minutes_played?: number | null
          opponent: string
          performance_notes?: string | null
          player_id: string
          plus_minus?: number | null
          points?: number | null
          raw_ai_data?: Json | null
          rebounds?: number | null
          result: string
          screenshot_url?: string | null
          steals?: number | null
          three_points_attempted?: number | null
          three_points_made?: number | null
          turnovers?: number | null
          updated_at?: string
          upload_method?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_processed?: boolean | null
          assists?: number | null
          blocks?: number | null
          created_at?: string
          created_by?: string
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          game_date?: string
          game_rating?: number | null
          id?: string
          minutes_played?: number | null
          opponent?: string
          performance_notes?: string | null
          player_id?: string
          plus_minus?: number | null
          points?: number | null
          raw_ai_data?: Json | null
          rebounds?: number | null
          result?: string
          screenshot_url?: string | null
          steals?: number | null
          three_points_attempted?: number | null
          three_points_made?: number | null
          turnovers?: number | null
          updated_at?: string
          upload_method?: string | null
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
          {
            foreignKeyName: "health_wellness_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
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
      manual_players: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          jersey_number: number | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          schedule_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          jersey_number?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          schedule_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          jersey_number?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          schedule_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_players_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
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
      medical_agreements: {
        Row: {
          agreement_name: string
          agreement_type: string
          auto_renewal: boolean | null
          created_at: string
          created_by: string | null
          emergency_fee: number | null
          end_date: string | null
          id: string
          medical_organization_id: string | null
          monthly_fee: number | null
          per_visit_fee: number | null
          start_date: string
          status: string
          terms: string | null
          updated_at: string
        }
        Insert: {
          agreement_name: string
          agreement_type?: string
          auto_renewal?: boolean | null
          created_at?: string
          created_by?: string | null
          emergency_fee?: number | null
          end_date?: string | null
          id?: string
          medical_organization_id?: string | null
          monthly_fee?: number | null
          per_visit_fee?: number | null
          start_date: string
          status?: string
          terms?: string | null
          updated_at?: string
        }
        Update: {
          agreement_name?: string
          agreement_type?: string
          auto_renewal?: boolean | null
          created_at?: string
          created_by?: string | null
          emergency_fee?: number | null
          end_date?: string | null
          id?: string
          medical_organization_id?: string | null
          monthly_fee?: number | null
          per_visit_fee?: number | null
          start_date?: string
          status?: string
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_agreements_medical_organization_id_fkey"
            columns: ["medical_organization_id"]
            isOneToOne: false
            referencedRelation: "medical_organizations"
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
      medical_organizations: {
        Row: {
          address: Json | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          license_expiry_date: string | null
          license_number: string | null
          name: string
          organization_type: string
          partnership_status: string
          partnership_type: string
          partnership_value: number | null
          specialties: string[] | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          license_expiry_date?: string | null
          license_number?: string | null
          name: string
          organization_type?: string
          partnership_status?: string
          partnership_type?: string
          partnership_value?: number | null
          specialties?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          license_expiry_date?: string | null
          license_number?: string | null
          name?: string
          organization_type?: string
          partnership_status?: string
          partnership_type?: string
          partnership_value?: number | null
          specialties?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      membership_adjustments: {
        Row: {
          created_at: string | null
          created_by: string
          delta: number
          id: string
          player_membership_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          delta: number
          id?: string
          player_membership_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          delta?: number
          id?: string
          player_membership_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_adjustments_player_membership_id_fkey"
            columns: ["player_membership_id"]
            isOneToOne: false
            referencedRelation: "player_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_alerts_sent: {
        Row: {
          alert_code: string
          id: string
          player_membership_id: string
          sent_at: string | null
        }
        Insert: {
          alert_code: string
          id?: string
          player_membership_id: string
          sent_at?: string | null
        }
        Update: {
          alert_code?: string
          id?: string
          player_membership_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_alerts_sent_player_membership_id_fkey"
            columns: ["player_membership_id"]
            isOneToOne: false
            referencedRelation: "player_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_types: {
        Row: {
          allocated_classes: number | null
          allocation_type: string
          created_at: string | null
          end_date_required: boolean | null
          id: string
          is_active: boolean | null
          name: string
          start_date_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          allocated_classes?: number | null
          allocation_type: string
          created_at?: string | null
          end_date_required?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allocated_classes?: number | null
          allocation_type?: string
          created_at?: string | null
          end_date_required?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date_required?: boolean | null
          updated_at?: string | null
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
            foreignKeyName: "fk_message_reactions_message_id"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
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
          edit_history: Json | null
          id: string
          is_archived: boolean | null
          is_edited: boolean | null
          is_recalled: boolean | null
          media_size: number | null
          media_type: string | null
          media_url: string | null
          message_type: string
          recalled_at: string | null
          recalled_by: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          edit_history?: Json | null
          id?: string
          is_archived?: boolean | null
          is_edited?: boolean | null
          is_recalled?: boolean | null
          media_size?: number | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          recalled_at?: string | null
          recalled_by?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          edit_history?: Json | null
          id?: string
          is_archived?: boolean | null
          is_edited?: boolean | null
          is_recalled?: boolean | null
          media_size?: number | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          recalled_at?: string | null
          recalled_by?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_chat_id"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recalled_by_fkey"
            columns: ["recalled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          push_enabled: boolean
          type_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          type_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          type_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_types: {
        Row: {
          category: string
          created_at: string
          default_enabled: boolean
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          priority: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type_id: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type_id?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to: string | null
          completion_date: string | null
          created_at: string
          due_date: string | null
          employee_id: string
          id: string
          priority: string
          status: string
          task_description: string | null
          task_name: string
          task_order: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completion_date?: string | null
          created_at?: string
          due_date?: string | null
          employee_id: string
          id?: string
          priority?: string
          status?: string
          task_description?: string | null
          task_name: string
          task_order?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completion_date?: string | null
          created_at?: string
          due_date?: string | null
          employee_id?: string
          id?: string
          priority?: string
          status?: string
          task_description?: string | null
          task_name?: string
          task_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      partner_team_sponsorships: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          partner_organization_id: string | null
          sponsorship_amount: number | null
          sponsorship_type: string
          start_date: string
          status: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          partner_organization_id?: string | null
          sponsorship_amount?: number | null
          sponsorship_type?: string
          start_date: string
          status?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          partner_organization_id?: string | null
          sponsorship_amount?: number | null
          sponsorship_type?: string
          start_date?: string
          status?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_team_sponsorships_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_team_sponsorships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      payroll_deduction_types: {
        Row: {
          calculation_type: string
          created_at: string | null
          default_rate: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          is_tax: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          calculation_type?: string
          created_at?: string | null
          default_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          is_tax?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          calculation_type?: string
          created_at?: string | null
          default_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          is_tax?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll_periods: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          pay_date: string
          period_name: string
          start_date: string
          status: string
          total_gross_pay: number | null
          total_net_pay: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          pay_date: string
          period_name: string
          start_date: string
          status?: string
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          pay_date?: string
          period_name?: string
          start_date?: string
          status?: string
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payroll_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      payslip_deductions: {
        Row: {
          amount: number
          calculation_base: number | null
          created_at: string | null
          deduction_type_id: string | null
          id: string
          payslip_id: string | null
          rate: number | null
        }
        Insert: {
          amount: number
          calculation_base?: number | null
          created_at?: string | null
          deduction_type_id?: string | null
          id?: string
          payslip_id?: string | null
          rate?: number | null
        }
        Update: {
          amount?: number
          calculation_base?: number | null
          created_at?: string | null
          deduction_type_id?: string | null
          id?: string
          payslip_id?: string | null
          rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslip_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_deductions_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          benefit_deductions: number | null
          bonuses: number | null
          deduction_details: Json | null
          employee_id: string
          generated_at: string
          gross_pay: number
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          net_pay: number
          other_deductions: number | null
          overtime_hours: number | null
          pay_date: string | null
          payroll_period_id: string
          regular_hours: number | null
          sent_at: string | null
          status: string
          tax_deductions: number | null
          total_deductions: number | null
        }
        Insert: {
          benefit_deductions?: number | null
          bonuses?: number | null
          deduction_details?: Json | null
          employee_id: string
          generated_at?: string
          gross_pay: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          net_pay: number
          other_deductions?: number | null
          overtime_hours?: number | null
          pay_date?: string | null
          payroll_period_id: string
          regular_hours?: number | null
          sent_at?: string | null
          status?: string
          tax_deductions?: number | null
          total_deductions?: number | null
        }
        Update: {
          benefit_deductions?: number | null
          bonuses?: number | null
          deduction_details?: Json | null
          employee_id?: string
          generated_at?: string
          gross_pay?: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          net_pay?: number
          other_deductions?: number | null
          overtime_hours?: number | null
          pay_date?: string | null
          payroll_period_id?: string
          regular_hours?: number | null
          sent_at?: string | null
          status?: string
          tax_deductions?: number | null
          total_deductions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          metric: string
          url: string
          user_id: string | null
          value: number
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          metric: string
          url: string
          user_id?: string | null
          value: number
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          metric?: string
          url?: string
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      player_medical_insurance: {
        Row: {
          copay_amount: number | null
          coverage_details: string | null
          created_at: string
          created_by: string
          deductible_amount: number | null
          dental_coverage: boolean | null
          effective_date: string
          emergency_coverage: boolean | null
          expiration_date: string | null
          group_number: string | null
          id: string
          insurance_provider: string
          is_primary: boolean | null
          notes: string | null
          out_of_pocket_max: number | null
          player_id: string
          policy_holder_name: string
          policy_holder_relationship: string
          policy_number: string
          pre_authorization_required: boolean | null
          prescription_coverage: boolean | null
          provider_address: string | null
          provider_phone: string | null
          updated_at: string
          vision_coverage: boolean | null
        }
        Insert: {
          copay_amount?: number | null
          coverage_details?: string | null
          created_at?: string
          created_by: string
          deductible_amount?: number | null
          dental_coverage?: boolean | null
          effective_date: string
          emergency_coverage?: boolean | null
          expiration_date?: string | null
          group_number?: string | null
          id?: string
          insurance_provider: string
          is_primary?: boolean | null
          notes?: string | null
          out_of_pocket_max?: number | null
          player_id: string
          policy_holder_name: string
          policy_holder_relationship: string
          policy_number: string
          pre_authorization_required?: boolean | null
          prescription_coverage?: boolean | null
          provider_address?: string | null
          provider_phone?: string | null
          updated_at?: string
          vision_coverage?: boolean | null
        }
        Update: {
          copay_amount?: number | null
          coverage_details?: string | null
          created_at?: string
          created_by?: string
          deductible_amount?: number | null
          dental_coverage?: boolean | null
          effective_date?: string
          emergency_coverage?: boolean | null
          expiration_date?: string | null
          group_number?: string | null
          id?: string
          insurance_provider?: string
          is_primary?: boolean | null
          notes?: string | null
          out_of_pocket_max?: number | null
          player_id?: string
          policy_holder_name?: string
          policy_holder_relationship?: string
          policy_number?: string
          pre_authorization_required?: boolean | null
          prescription_coverage?: boolean | null
          provider_address?: string | null
          provider_phone?: string | null
          updated_at?: string
          vision_coverage?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "player_medical_insurance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_medical_insurance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
          },
        ]
      }
      player_memberships: {
        Row: {
          allocated_classes_override: number | null
          auto_deactivate_when_used_up: boolean | null
          created_at: string | null
          end_date: string | null
          id: string
          manual_override_active: boolean | null
          membership_type_id: string
          notes: string | null
          player_id: string
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          allocated_classes_override?: number | null
          auto_deactivate_when_used_up?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          manual_override_active?: boolean | null
          membership_type_id: string
          notes?: string | null
          player_id: string
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          allocated_classes_override?: number | null
          auto_deactivate_when_used_up?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          manual_override_active?: boolean | null
          membership_type_id?: string
          notes?: string | null
          player_id?: string
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_memberships_membership_type_id_fkey"
            columns: ["membership_type_id"]
            isOneToOne: false
            referencedRelation: "membership_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_memberships_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_memberships_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
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
          {
            foreignKeyName: "player_performance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
          },
        ]
      }
      player_teams: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          id: string
          is_active: boolean
          player_id: string
          role_on_team: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          id?: string
          is_active?: boolean
          player_id: string
          role_on_team?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          id?: string
          is_active?: boolean
          player_id?: string
          role_on_team?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          avg_arc_degrees: number | null
          avg_depth_inches: number | null
          created_at: string | null
          date_of_birth: string | null
          deactivation_reason: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          height: string | null
          id: string
          is_active: boolean
          jersey_number: number | null
          last_session_date: string | null
          manual_entry_email: string | null
          manual_entry_name: string | null
          manual_entry_phone: string | null
          medical_notes: string | null
          name: string | null
          notes: string | null
          position: string | null
          shooting_percentage: number | null
          team_id: string | null
          total_makes: number | null
          total_sessions: number | null
          total_shots: number | null
          updated_at: string | null
          user_id: string | null
          weight: string | null
        }
        Insert: {
          avg_arc_degrees?: number | null
          avg_depth_inches?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deactivation_reason?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height?: string | null
          id?: string
          is_active?: boolean
          jersey_number?: number | null
          last_session_date?: string | null
          manual_entry_email?: string | null
          manual_entry_name?: string | null
          manual_entry_phone?: string | null
          medical_notes?: string | null
          name?: string | null
          notes?: string | null
          position?: string | null
          shooting_percentage?: number | null
          team_id?: string | null
          total_makes?: number | null
          total_sessions?: number | null
          total_shots?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight?: string | null
        }
        Update: {
          avg_arc_degrees?: number | null
          avg_depth_inches?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deactivation_reason?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height?: string | null
          id?: string
          is_active?: boolean
          jersey_number?: number | null
          last_session_date?: string | null
          manual_entry_email?: string | null
          manual_entry_name?: string | null
          manual_entry_phone?: string | null
          medical_notes?: string | null
          name?: string | null
          notes?: string | null
          position?: string | null
          shooting_percentage?: number | null
          team_id?: string | null
          total_makes?: number | null
          total_sessions?: number | null
          total_shots?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_players_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          rejection_reason: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          rejection_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          rejection_reason?: string | null
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
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      schedule_change_requests: {
        Row: {
          created_at: string
          id: string
          new_schedule_data: Json
          original_schedule_id: string | null
          reason: string | null
          request_type: string
          requester_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_employee_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_schedule_data: Json
          original_schedule_id?: string | null
          reason?: string | null
          request_type: string
          requester_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_employee_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          new_schedule_data?: Json
          original_schedule_id?: string | null
          reason?: string | null
          request_type?: string
          requester_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_employee_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_change_requests_original_schedule_id_fkey"
            columns: ["original_schedule_id"]
            isOneToOne: false
            referencedRelation: "employee_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_change_requests_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      shift_templates: {
        Row: {
          break_duration_minutes: number | null
          created_at: string
          created_by: string
          days_of_week: number[]
          department: string | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          location: string | null
          position: string | null
          start_time: string
          template_name: string
          updated_at: string
        }
        Insert: {
          break_duration_minutes?: number | null
          created_at?: string
          created_by: string
          days_of_week: number[]
          department?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          position?: string | null
          start_time: string
          template_name: string
          updated_at?: string
        }
        Update: {
          break_duration_minutes?: number | null
          created_at?: string
          created_by?: string
          days_of_week?: number[]
          department?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          position?: string | null
          start_time?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shot_analytics: {
        Row: {
          avg_arc_degrees: number | null
          avg_depth_inches: number | null
          consistency_score: number | null
          court_zone: string
          created_at: string
          id: string
          make_percentage: number | null
          makes: number | null
          player_id: string
          session_id: string
          shot_type: string
          total_attempts: number | null
          updated_at: string
        }
        Insert: {
          avg_arc_degrees?: number | null
          avg_depth_inches?: number | null
          consistency_score?: number | null
          court_zone: string
          created_at?: string
          id?: string
          make_percentage?: number | null
          makes?: number | null
          player_id: string
          session_id: string
          shot_type: string
          total_attempts?: number | null
          updated_at?: string
        }
        Update: {
          avg_arc_degrees?: number | null
          avg_depth_inches?: number | null
          consistency_score?: number | null
          court_zone?: string
          created_at?: string
          id?: string
          make_percentage?: number | null
          makes?: number | null
          player_id?: string
          session_id?: string
          shot_type?: string
          total_attempts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_analytics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_analytics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "shot_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "shot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_sessions: {
        Row: {
          avg_arc_degrees: number | null
          avg_depth_inches: number | null
          avg_lr_deviation_inches: number | null
          created_at: string
          id: string
          location: string | null
          makes: number | null
          notes: string | null
          player_id: string
          rim_height_inches: number | null
          session_duration_minutes: number | null
          session_name: string
          super_admin_id: string
          total_shots: number | null
          updated_at: string
        }
        Insert: {
          avg_arc_degrees?: number | null
          avg_depth_inches?: number | null
          avg_lr_deviation_inches?: number | null
          created_at?: string
          id?: string
          location?: string | null
          makes?: number | null
          notes?: string | null
          player_id: string
          rim_height_inches?: number | null
          session_duration_minutes?: number | null
          session_name?: string
          super_admin_id: string
          total_shots?: number | null
          updated_at?: string
        }
        Update: {
          avg_arc_degrees?: number | null
          avg_depth_inches?: number | null
          avg_lr_deviation_inches?: number | null
          created_at?: string
          id?: string
          location?: string | null
          makes?: number | null
          notes?: string | null
          player_id?: string
          rim_height_inches?: number | null
          session_duration_minutes?: number | null
          session_name?: string
          super_admin_id?: string
          total_shots?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
          },
        ]
      }
      shotiq_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string
          player_id: string
          priority: string | null
          session_id: string | null
          subject: string | null
          super_admin_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          player_id: string
          priority?: string | null
          session_id?: string | null
          subject?: string | null
          super_admin_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          player_id?: string
          priority?: string | null
          session_id?: string | null
          subject?: string | null
          super_admin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shotiq_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shotiq_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "shotiq_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "shot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shotiq_settings: {
        Row: {
          created_at: string
          id: string
          player_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      shots: {
        Row: {
          ai_analysis_data: Json | null
          arc_degrees: number | null
          audio_feedback: string | null
          court_x_position: number | null
          court_y_position: number | null
          created_at: string
          depth_inches: number | null
          id: string
          lr_deviation_inches: number | null
          made: boolean
          player_id: string
          session_id: string
          shot_number: number
          shot_type: string | null
          timestamp_in_session: number | null
          video_analysis_data: Json | null
          video_analysis_status: string | null
          video_duration_seconds: number | null
          video_filename: string | null
          video_upload_date: string | null
          video_url: string | null
        }
        Insert: {
          ai_analysis_data?: Json | null
          arc_degrees?: number | null
          audio_feedback?: string | null
          court_x_position?: number | null
          court_y_position?: number | null
          created_at?: string
          depth_inches?: number | null
          id?: string
          lr_deviation_inches?: number | null
          made?: boolean
          player_id: string
          session_id: string
          shot_number: number
          shot_type?: string | null
          timestamp_in_session?: number | null
          video_analysis_data?: Json | null
          video_analysis_status?: string | null
          video_duration_seconds?: number | null
          video_filename?: string | null
          video_upload_date?: string | null
          video_url?: string | null
        }
        Update: {
          ai_analysis_data?: Json | null
          arc_degrees?: number | null
          audio_feedback?: string | null
          court_x_position?: number | null
          court_y_position?: number | null
          created_at?: string
          depth_inches?: number | null
          id?: string
          lr_deviation_inches?: number | null
          made?: boolean
          player_id?: string
          session_id?: string
          shot_number?: number
          shot_type?: string | null
          timestamp_in_session?: number | null
          video_analysis_data?: Json | null
          video_analysis_status?: string | null
          video_duration_seconds?: number | null
          video_filename?: string | null
          video_upload_date?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "shots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "shot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_departments: {
        Row: {
          budget_allocation: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          budget_allocation?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          budget_allocation?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          updated_at?: string
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
      staff_team_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assignment_type: string
          created_at: string
          id: string
          staff_id: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assignment_type?: string
          created_at?: string
          id?: string
          staff_id: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assignment_type?: string
          created_at?: string
          id?: string
          staff_id?: string
          status?: string
          team_id?: string
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
      template_permissions: {
        Row: {
          id: string
          permission_id: string
          template_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          template_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approval_status: string
          approved_by: string | null
          break_duration_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          employee_id: string
          entry_type: string
          id: string
          notes: string | null
          overtime_hours: number | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_by?: string | null
          break_duration_minutes?: number | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          employee_id: string
          entry_type?: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_by?: string | null
          break_duration_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          entry_type?: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          denial_reason: string | null
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          request_type: string
          start_date: string
          status: string
          total_days: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          denial_reason?: string | null
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          request_type: string
          start_date: string
          status?: string
          total_days: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          denial_reason?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          request_type?: string
          start_date?: string
          status?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          coach_feedback: string | null
          created_at: string
          drill_plan_id: string | null
          duration_minutes: number | null
          exercises_completed: Json | null
          fatigue_level: number | null
          focus_level: number | null
          id: string
          improvement_notes: string | null
          performance_metrics: Json | null
          player_id: string
          recorded_by: string
          session_date: string
          updated_at: string
        }
        Insert: {
          coach_feedback?: string | null
          created_at?: string
          drill_plan_id?: string | null
          duration_minutes?: number | null
          exercises_completed?: Json | null
          fatigue_level?: number | null
          focus_level?: number | null
          id?: string
          improvement_notes?: string | null
          performance_metrics?: Json | null
          player_id: string
          recorded_by: string
          session_date?: string
          updated_at?: string
        }
        Update: {
          coach_feedback?: string | null
          created_at?: string
          drill_plan_id?: string | null
          duration_minutes?: number | null
          exercises_completed?: Json | null
          fatigue_level?: number | null
          focus_level?: number | null
          id?: string
          improvement_notes?: string | null
          performance_metrics?: Json | null
          player_id?: string
          recorded_by?: string
          session_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_approval_requests: {
        Row: {
          id: string
          notes: string | null
          reason: string | null
          requested_at: string
          requested_role: Database["public"]["Enums"]["user_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          reason?: string | null
          requested_at?: string
          requested_role: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          reason?: string | null
          requested_at?: string
          requested_role?: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          permission_id: string
          reason: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          permission_id: string
          reason?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          permission_id?: string
          reason?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
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
      video_analysis_jobs: {
        Row: {
          analysis_data: Json | null
          analysis_status: string
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          shot_id: string | null
          started_at: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          analysis_data?: Json | null
          analysis_status?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          shot_id?: string | null
          started_at?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          analysis_data?: Json | null
          analysis_status?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          shot_id?: string | null
          started_at?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_player_membership_usage_secure: {
        Row: {
          allocated_classes: number | null
          allocation_type: string | null
          days_left: number | null
          end_date: string | null
          is_expired: boolean | null
          membership_type_name: string | null
          player_id: string | null
          player_name: string | null
          remaining_classes: number | null
          should_deactivate: boolean | null
          start_date: string | null
          status: string | null
          used_classes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_permission: {
        Args: {
          assigned_by_user_id?: string
          assignment_reason?: string
          permission_name: string
          target_user_id: string
        }
        Returns: Json
      }
      assign_user_role: {
        Args: {
          assigned_by_user_id?: string
          target_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: Json
      }
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_notification: {
        Args: {
          entity_id?: string
          entity_type?: string
          expiry_hours?: number
          notification_action_url?: string
          notification_data?: Json
          notification_message: string
          notification_priority?: string
          notification_title: string
          notification_type: string
          target_user_id: string
        }
        Returns: string
      }
      determine_shot_region: {
        Args: { _x: number; _y: number }
        Returns: string
      }
      fn_auto_deactivate_players: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fn_get_membership_summary: {
        Args: { target_player_id: string }
        Returns: Json
      }
      generate_payslips_for_period: {
        Args: { period_id: string }
        Returns: Json
      }
      get_benefit_cost_analysis: {
        Args: { report_end_date?: string; report_start_date?: string }
        Returns: {
          average_cost_per_employee: number
          enrollment_count: number
          plan_type: string
          total_employee_cost: number
          total_employer_cost: number
        }[]
      }
      get_benefit_enrollment_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_enrollments: number
          plan_name: string
          plan_type: string
          total_cost: number
          total_enrolled: number
        }[]
      }
      get_current_user_team_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_employee_compensation_secure: {
        Args: { employee_uuid: string }
        Returns: {
          emergency_contact_name: string
          emergency_contact_phone: string
          employee_id: string
          hourly_rate: number
          salary: number
        }[]
      }
      get_employees_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          department: string
          email: string
          employee_id: string
          employment_status: string
          first_name: string
          has_compensation_access: boolean
          hire_date: string
          id: string
          last_name: string
          payment_type: string
          phone: string
          position: string
          updated_at: string
        }[]
      }
      get_safe_profile_info: {
        Args: { profile_id: string }
        Returns: {
          access_level: string
          display_name: string
          id: string
        }[]
      }
      get_unread_notification_count: {
        Args: { user_uuid?: string }
        Returns: number
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          permission_description: string
          permission_name: string
          source: string
        }[]
      }
      get_user_requested_role: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_roles_and_permissions: {
        Args: { target_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_same_team_member: {
        Args: { _team_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_user_approved: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_employee_access: {
        Args: {
          access_type: string
          accessed_employee_id: string
          includes_sensitive_data?: boolean
        }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: { user_uuid?: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      mask_employee_compensation: {
        Args: {
          _employee_user_id: string
          _hourly_rate: number
          _salary: number
        }
        Returns: Record<string, unknown>
      }
      mask_sensitive_email: {
        Args: { email_input: string }
        Returns: string
      }
      remove_user_permission: {
        Args: {
          permission_name: string
          removed_by_user_id?: string
          target_user_id: string
        }
        Returns: Json
      }
      remove_user_role: {
        Args: {
          removed_by_user_id?: string
          target_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: Json
      }
      user_created_chat: {
        Args: { chat_id: string; user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      user_is_approved: {
        Args: Record<PropertyKey, never>
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
