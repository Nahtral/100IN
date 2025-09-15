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
      attendance: {
        Row: {
          event_id: string
          id: string
          notes: string | null
          player_id: string
          recorded_at: string
          recorded_by: string
          status: string
          team_id: string
        }
        Insert: {
          event_id: string
          id?: string
          notes?: string | null
          player_id: string
          recorded_at?: string
          recorded_by: string
          status: string
          team_id: string
        }
        Update: {
          event_id?: string
          id?: string
          notes?: string | null
          player_id?: string
          recorded_at?: string
          recorded_by?: string
          status?: string
          team_id?: string
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
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          chat_id: string
          client_msg_id: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          language_code: string | null
          message_type: string | null
          reply_to_id: string | null
          sender_id: string
          status: string
          version: number | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          chat_id: string
          client_msg_id?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          language_code?: string | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id: string
          status?: string
          version?: number | null
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          chat_id?: string
          client_msg_id?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          language_code?: string | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string
          status?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "v_chat_display"
            referencedColumns: ["chat_id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          display_alias: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          display_alias?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          display_alias?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
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
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "v_chat_display"
            referencedColumns: ["chat_id"]
          },
        ]
      }
      chats: {
        Row: {
          chat_type: string
          created_at: string | null
          created_by: string
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          name: string
          status: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          chat_type: string
          created_at?: string | null
          created_by: string
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name: string
          status?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          chat_type?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string
          status?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      employee_emergency_contacts: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          email: string | null
          employee_id: string
          id: string
          is_primary: boolean
          name: string
          phone: string
          relationship: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          employee_id: string
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          relationship: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          employee_id?: string
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          relationship?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days_requested: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          notes: string | null
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_requested: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          notes?: string | null
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_requested?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          notes?: string | null
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_pending_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_leave_requests_employee_id_fkey"
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
      event_player_grades: {
        Row: {
          ball_handling: number | null
          boxout_frequency: number | null
          coachable: number | null
          communication: number | null
          competitiveness: number | null
          consistency: number | null
          court_vision: number | null
          created_at: string | null
          cutting: number | null
          decision_making: number | null
          event_type: string
          footwork: number | null
          game_iq: number | null
          graded_by: string
          grading_session_id: string | null
          id: string
          leadership: number | null
          notes: string | null
          overall_grade: number | null
          passing: number | null
          player_id: string
          reaction_time: number | null
          rebounding: number | null
          schedule_id: string
          shooting: number | null
          teammate_support: number | null
          updated_at: string | null
        }
        Insert: {
          ball_handling?: number | null
          boxout_frequency?: number | null
          coachable?: number | null
          communication?: number | null
          competitiveness?: number | null
          consistency?: number | null
          court_vision?: number | null
          created_at?: string | null
          cutting?: number | null
          decision_making?: number | null
          event_type: string
          footwork?: number | null
          game_iq?: number | null
          graded_by: string
          grading_session_id?: string | null
          id?: string
          leadership?: number | null
          notes?: string | null
          overall_grade?: number | null
          passing?: number | null
          player_id: string
          reaction_time?: number | null
          rebounding?: number | null
          schedule_id: string
          shooting?: number | null
          teammate_support?: number | null
          updated_at?: string | null
        }
        Update: {
          ball_handling?: number | null
          boxout_frequency?: number | null
          coachable?: number | null
          communication?: number | null
          competitiveness?: number | null
          consistency?: number | null
          court_vision?: number | null
          created_at?: string | null
          cutting?: number | null
          decision_making?: number | null
          event_type?: string
          footwork?: number | null
          game_iq?: number | null
          graded_by?: string
          grading_session_id?: string | null
          id?: string
          leadership?: number | null
          notes?: string | null
          overall_grade?: number | null
          passing?: number | null
          player_id?: string
          reaction_time?: number | null
          rebounding?: number | null
          schedule_id?: string
          shooting?: number | null
          teammate_support?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_player_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_player_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "v_pending_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_player_grades_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_player_grades_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
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
      grading_metrics: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          weight?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          weight?: number
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
      locations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
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
        Relationships: []
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
        Relationships: []
      }
      membership_ledger: {
        Row: {
          created_at: string
          delta: number
          event_id: string | null
          id: string
          player_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          delta: number
          event_id?: string | null
          id?: string
          player_id: string
          reason: string
        }
        Update: {
          created_at?: string
          delta?: number
          event_id?: string | null
          id?: string
          player_id?: string
          reason?: string
        }
        Relationships: []
      }
      membership_types: {
        Row: {
          allocated_classes: number | null
          allocation_type: string
          created_at: string
          end_date_required: boolean
          id: string
          is_active: boolean
          name: string
          start_date_required: boolean
          updated_at: string
        }
        Insert: {
          allocated_classes?: number | null
          allocation_type: string
          created_at?: string
          end_date_required?: boolean
          id?: string
          is_active?: boolean
          name: string
          start_date_required?: boolean
          updated_at?: string
        }
        Update: {
          allocated_classes?: number | null
          allocation_type?: string
          created_at?: string
          end_date_required?: boolean
          id?: string
          is_active?: boolean
          name?: string
          start_date_required?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      membership_usage: {
        Row: {
          classes_used: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          player_membership_id: string
          usage_date: string
        }
        Insert: {
          classes_used?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          player_membership_id: string
          usage_date?: string
        }
        Update: {
          classes_used?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          player_membership_id?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_usage_player_membership_id_fkey"
            columns: ["player_membership_id"]
            isOneToOne: false
            referencedRelation: "player_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_usage_player_membership_id_fkey"
            columns: ["player_membership_id"]
            isOneToOne: false
            referencedRelation: "vw_player_membership_usage_secure"
            referencedColumns: ["membership_id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
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
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_translations: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          message_id: string
          original_content: string
          source_language: string
          target_language: string
          translated_content: string
          translation_quality: string | null
          translation_service: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          message_id: string
          original_content: string
          source_language?: string
          target_language: string
          translated_content: string
          translation_quality?: string | null
          translation_service?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          message_id?: string
          original_content?: string
          source_language?: string
          target_language?: string
          translated_content?: string
          translation_quality?: string | null
          translation_service?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_message_translations_message_id"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
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
          desktop_push_enabled: boolean
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          mute_until: string | null
          push_enabled: boolean
          severity_filters: string[]
          sound_enabled: boolean
          type_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desktop_push_enabled?: boolean
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          mute_until?: string | null
          push_enabled?: boolean
          severity_filters?: string[]
          sound_enabled?: boolean
          type_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          desktop_push_enabled?: boolean
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          mute_until?: string | null
          push_enabled?: boolean
          severity_filters?: string[]
          sound_enabled?: boolean
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
      partner_communications: {
        Row: {
          attachments: Json | null
          communication_type: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          partner_organization_id: string | null
          priority: string
          recipient_type: string
          response_deadline: string | null
          response_required: boolean | null
          scheduled_for: string | null
          sender_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          communication_type: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          partner_organization_id?: string | null
          priority?: string
          recipient_type: string
          response_deadline?: string | null
          response_required?: boolean | null
          scheduled_for?: string | null
          sender_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          communication_type?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          partner_organization_id?: string | null
          priority?: string
          recipient_type?: string
          response_deadline?: string | null
          response_required?: boolean | null
          scheduled_for?: string | null
          sender_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_contacts: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          contact_title: string | null
          created_at: string
          id: string
          is_primary: boolean
          partner_organization_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          partner_organization_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          partner_organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_contacts_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contacts_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "v_partner_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          is_internal: boolean
          note_body: string
          partner_organization_id: string | null
          sponsorship_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
          note_body: string
          partner_organization_id?: string | null
          sponsorship_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          note_body?: string
          partner_organization_id?: string | null
          sponsorship_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notes_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notes_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "v_partner_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notes_sponsorship_id_fkey"
            columns: ["sponsorship_id"]
            isOneToOne: false
            referencedRelation: "partner_team_sponsorships"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "partner_team_sponsorships_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "v_partner_summary"
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
          {
            foreignKeyName: "partner_user_relationships_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "v_partner_summary"
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
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "v_pending_users"
            referencedColumns: ["user_id"]
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
      player_grade_items: {
        Row: {
          created_at: string | null
          grade_id: string
          id: string
          metric_id: string
          priority: string | null
          score: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grade_id: string
          id?: string
          metric_id: string
          priority?: string | null
          score: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grade_id?: string
          id?: string
          metric_id?: string
          priority?: string | null
          score?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_grade_items_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "player_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_grade_items_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "grading_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      player_grades: {
        Row: {
          created_at: string | null
          created_by: string
          event_id: string
          id: string
          overall: number | null
          player_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          event_id: string
          id?: string
          overall?: number | null
          player_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          event_id?: string
          id?: string
          overall?: number | null
          player_id?: string
          updated_at?: string | null
        }
        Relationships: []
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
        ]
      }
      player_memberships: {
        Row: {
          allocated_classes_override: number | null
          auto_deactivate_when_used_up: boolean
          created_at: string
          credits_remaining: number
          end_date: string | null
          id: string
          manual_override_active: boolean
          membership_type_id: string
          notes: string | null
          player_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          allocated_classes_override?: number | null
          auto_deactivate_when_used_up?: boolean
          created_at?: string
          credits_remaining?: number
          end_date?: string | null
          id?: string
          manual_override_active?: boolean
          membership_type_id: string
          notes?: string | null
          player_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          allocated_classes_override?: number | null
          auto_deactivate_when_used_up?: boolean
          created_at?: string
          credits_remaining?: number
          end_date?: string | null
          id?: string
          manual_override_active?: boolean
          membership_type_id?: string
          notes?: string | null
          player_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_memberships_membership_type_id_fkey"
            columns: ["membership_type_id"]
            isOneToOne: false
            referencedRelation: "membership_types"
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
        Relationships: [
          {
            foreignKeyName: "fk_player_teams_player_id"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_player_teams_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_players_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_pending_users"
            referencedColumns: ["user_id"]
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
          latest_tryout_date: string | null
          latest_tryout_placement:
            | Database["public"]["Enums"]["tryout_team"]
            | null
          latest_tryout_total: number | null
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
          latest_tryout_date?: string | null
          latest_tryout_placement?:
            | Database["public"]["Enums"]["tryout_team"]
            | null
          latest_tryout_total?: number | null
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
          latest_tryout_date?: string | null
          latest_tryout_placement?:
            | Database["public"]["Enums"]["tryout_team"]
            | null
          latest_tryout_total?: number | null
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
          archived_at: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          end_time: string
          event_type: string
          id: string
          image_url: string | null
          is_recurring: boolean | null
          location: string | null
          location_id: string | null
          opponent: string | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          start_time: string
          status: string | null
          team_ids: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          location_id?: string | null
          opponent?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          start_time: string
          status?: string | null
          team_ids?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          location_id?: string | null
          opponent?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          start_time?: string
          status?: string | null
          team_ids?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
      shot_analysis: {
        Row: {
          analysis_confidence: number | null
          arc_degrees: number | null
          audio_feedback: string | null
          ball_rotation_rpm: number | null
          computer_vision_data: Json | null
          consistency_score: number | null
          created_at: string
          depth_inches: number | null
          entry_angle: number | null
          id: string
          lr_deviation_inches: number | null
          peak_height_inches: number | null
          processed_by: string | null
          processing_time_ms: number | null
          recommendations: Json | null
          release_time_ms: number | null
          shot_id: string
          updated_at: string
        }
        Insert: {
          analysis_confidence?: number | null
          arc_degrees?: number | null
          audio_feedback?: string | null
          ball_rotation_rpm?: number | null
          computer_vision_data?: Json | null
          consistency_score?: number | null
          created_at?: string
          depth_inches?: number | null
          entry_angle?: number | null
          id?: string
          lr_deviation_inches?: number | null
          peak_height_inches?: number | null
          processed_by?: string | null
          processing_time_ms?: number | null
          recommendations?: Json | null
          release_time_ms?: number | null
          shot_id: string
          updated_at?: string
        }
        Update: {
          analysis_confidence?: number | null
          arc_degrees?: number | null
          audio_feedback?: string | null
          ball_rotation_rpm?: number | null
          computer_vision_data?: Json | null
          consistency_score?: number | null
          created_at?: string
          depth_inches?: number | null
          entry_angle?: number | null
          id?: string
          lr_deviation_inches?: number | null
          peak_height_inches?: number | null
          processed_by?: string | null
          processing_time_ms?: number | null
          recommendations?: Json | null
          release_time_ms?: number | null
          shot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shot_analysis_shot_id"
            columns: ["shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["id"]
          },
        ]
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
      team_members: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          team_id?: string
          user_id?: string
        }
        Relationships: []
      }
      teamgrid_settings: {
        Row: {
          accent_color: string
          allow_bulk_import: boolean
          allow_manual_players: boolean
          created_at: string
          default_view: string
          enable_archived_filter: boolean
          id: string
          page_size: number
          sort_by: string
          sort_direction: string
          updated_at: string
          visible_columns: string[]
        }
        Insert: {
          accent_color?: string
          allow_bulk_import?: boolean
          allow_manual_players?: boolean
          created_at?: string
          default_view?: string
          enable_archived_filter?: boolean
          id?: string
          page_size?: number
          sort_by?: string
          sort_direction?: string
          updated_at?: string
          visible_columns?: string[]
        }
        Update: {
          accent_color?: string
          allow_bulk_import?: boolean
          allow_manual_players?: boolean
          created_at?: string
          default_view?: string
          enable_archived_filter?: boolean
          id?: string
          page_size?: number
          sort_by?: string
          sort_direction?: string
          updated_at?: string
          visible_columns?: string[]
        }
        Relationships: []
      }
      teams: {
        Row: {
          age_group: string
          coach_id: string | null
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          season: string
          updated_at: string | null
        }
        Insert: {
          age_group: string
          coach_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          season: string
          updated_at?: string | null
        }
        Update: {
          age_group?: string
          coach_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
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
      tryout_evaluations: {
        Row: {
          athleticism: number
          ball_handling: number
          created_at: string | null
          defense: number
          evaluator_id: string
          event_name: string | null
          id: string
          iq: number
          notes: string | null
          placement: Database["public"]["Enums"]["tryout_team"] | null
          player_id: string
          shooting: number
          total: number | null
          updated_at: string | null
        }
        Insert: {
          athleticism: number
          ball_handling: number
          created_at?: string | null
          defense: number
          evaluator_id: string
          event_name?: string | null
          id?: string
          iq: number
          notes?: string | null
          placement?: Database["public"]["Enums"]["tryout_team"] | null
          player_id: string
          shooting: number
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          athleticism?: number
          ball_handling?: number
          created_at?: string | null
          defense?: number
          evaluator_id?: string
          event_name?: string | null
          id?: string
          iq?: number
          notes?: string | null
          placement?: Database["public"]["Enums"]["tryout_team"] | null
          player_id?: string
          shooting?: number
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tryout_evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_pending_users"
            referencedColumns: ["user_id"]
          },
        ]
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
      user_roles_simple: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
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
      v_chat_display: {
        Row: {
          chat_id: string | null
          chat_type: string | null
          created_at: string | null
          display_name: string | null
          is_archived: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          original_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          chat_id?: string | null
          chat_type?: string | null
          created_at?: string | null
          display_name?: never
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          original_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          chat_id?: string | null
          chat_type?: string | null
          created_at?: string | null
          display_name?: never
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          original_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_partner_summary: {
        Row: {
          active_sponsorships: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          description: string | null
          earliest_partnership: string | null
          id: string | null
          latest_partnership: string | null
          name: string | null
          partnership_type: string | null
          partnership_value: number | null
          status: string | null
          total_sponsorship_value: number | null
          total_sponsorships: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_pending_users: {
        Row: {
          approval_status: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          preferred_role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_player_attendance_summary: {
        Row: {
          absent_count: number | null
          excused_count: number | null
          late_count: number | null
          player_id: string | null
          present_count: number | null
        }
        Relationships: []
      }
      v_player_latest_grade: {
        Row: {
          event_id: string | null
          overall: number | null
          player_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_player_membership_usage: {
        Row: {
          credits_remaining: number | null
          has_active_membership: boolean | null
          player_id: string | null
        }
        Relationships: []
      }
      vw_player_membership_usage_secure: {
        Row: {
          allocated_classes: number | null
          allocation_type: string | null
          days_left: number | null
          end_date: string | null
          is_expired: boolean | null
          membership_id: string | null
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
      bulk_convert_users_to_players: {
        Args:
          | { converted_by_user_id?: string; user_ids: string[] }
          | { user_ids: string[] }
        Returns: Json
      }
      calculate_overall_grade: {
        Args: {
          ball_handling?: number
          boxout_frequency?: number
          coachable?: number
          communication?: number
          competitiveness?: number
          consistency?: number
          court_vision?: number
          cutting?: number
          decision_making?: number
          footwork?: number
          game_iq?: number
          leadership?: number
          passing?: number
          reaction_time?: number
          rebounding?: number
          shooting?: number
          teammate_support?: number
        }
        Returns: number
      }
      can_create_player_record: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_api_rate_limit: {
        Args: {
          endpoint_name: string
          max_requests?: number
          time_window_minutes?: number
          user_uuid: string
        }
        Returns: boolean
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
      current_user_has_role: {
        Args: { check_role: string }
        Returns: boolean
      }
      debug_current_user: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      delete_notification: {
        Args: { notification_id: string }
        Returns: boolean
      }
      determine_shot_region: {
        Args: { _x: number; _y: number }
        Returns: string
      }
      edit_message_versioned: {
        Args: { p_message_id: string; p_new_content: string; p_user_id: string }
        Returns: undefined
      }
      export_tryout_evaluations: {
        Args: {
          end_date?: string
          evaluator_filter?: string
          event_filter?: string
          placement_filter?: string
          start_date?: string
        }
        Returns: {
          athleticism: number
          ball_handling: number
          defense: number
          evaluation_date: string
          evaluator_name: string
          event_name: string
          iq: number
          notes: string
          placement: string
          player_name: string
          shooting: number
          total: number
        }[]
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
      get_active_teams: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      get_approved_players: {
        Args: Record<PropertyKey, never> | { search_term?: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          phone: string
        }[]
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
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
          approval_status: string
          created_at: string
          department: string
          email: string
          employee_id: string
          employment_status: string
          first_name: string
          full_name: string
          hire_date: string
          id: string
          last_name: string
          payment_type: string
          phone: string
          position: string
          role: string
          role_active: boolean
          role_display: string
        }[]
      }
      get_notifications_paginated: {
        Args: { page_limit?: number; page_offset?: number }
        Returns: {
          action_url: string
          created_at: string
          data: Json
          expires_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          read_at: string
          related_entity_id: string
          related_entity_type: string
          title: string
          type_category: string
          type_description: string
          type_icon: string
          type_id: string
          type_name: string
          user_id: string
        }[]
      }
      get_onboarding_errors: {
        Args: { limit_count?: number }
        Returns: {
          email: string
          error_code: string
          error_message: string
          error_timestamp: string
          user_id: string
        }[]
      }
      get_player_team_assignments: {
        Args: { player_user_id: string }
        Returns: {
          assigned_at: string
          assignment_id: string
          is_active: boolean
          role_on_team: string
          team_id: string
          team_name: string
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
      get_user_auth_data_secure: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      get_user_auth_data_simple: {
        Args: { target_user_id?: string }
        Returns: Json
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
      get_user_role_simple: {
        Args: { uid?: string }
        Returns: string
      }
      get_user_roles_and_permissions: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_user_team_memberships: {
        Args: { target_user_id?: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_simple: {
        Args: { r: string; uid: string }
        Returns: boolean
      }
      is_current_user_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_email_available: {
        Args: { check_email: string }
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
      is_super_admin_simple: {
        Args: { uid?: string }
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
        Returns: boolean
      }
      mark_notification_unread: {
        Args: { notification_id: string }
        Returns: boolean
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
      recall_message_versioned: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: undefined
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
      rpc_add_partner_note: {
        Args: {
          is_internal?: boolean
          note_body?: string
          partner_id?: string
          sponsorship_id?: string
        }
        Returns: string
      }
      rpc_approve_user_secure: {
        Args: {
          approval_decision?: string
          rejection_reason?: string
          target_user_id: string
        }
        Returns: Json
      }
      rpc_create_chat: {
        Args:
          | {
              chat_name: string
              chat_type_param: string
              participant_ids: string[]
              team_id_param?: string
            }
          | { p_is_group: boolean; p_participants: string[]; p_title: string }
        Returns: string
      }
      rpc_dashboard_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      rpc_delete_chat: {
        Args: { p_chat_id: string; p_permanent?: boolean }
        Returns: undefined
      }
      rpc_diag_orphans: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          has_profile: boolean
          user_id: string
        }[]
      }
      rpc_duplicate_event: {
        Args: {
          copy_teams?: boolean
          event_id: string
          new_title?: string
          shift_days?: number
        }
        Returns: string
      }
      rpc_edit_or_recall_message: {
        Args: {
          p_message_id: string
          p_new_content?: string
          p_recall?: boolean
        }
        Returns: undefined
      }
      rpc_forward_message: {
        Args: { p_source_message_id: string; p_target_chat_ids: string[] }
        Returns: undefined
      }
      rpc_get_chat_participants: {
        Args: { chat_id_param: string }
        Returns: {
          id: string
          joined_at: string
          role: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      rpc_get_employees: {
        Args: { lim?: number; off?: number; q?: string }
        Returns: {
          email: string
          employee_id: string
          full_name: string
          phone: string
          role: string
          role_display: string
        }[]
      }
      rpc_get_messages: {
        Args: { before?: string; chat: string; limit_n?: number }
        Returns: {
          attachment_url: string
          body: string
          chat_id: string
          created_at: string
          edited_at: string
          id: string
          message_type: string
          reactions: Json
          sender_email: string
          sender_id: string
          sender_name: string
        }[]
      }
      rpc_get_pending_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          approval_status: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          preferred_role: string | null
          updated_at: string | null
          user_id: string | null
        }[]
      }
      rpc_list_chats: {
        Args: { limit_n?: number; offset_n?: number }
        Returns: {
          chat_id: string
          chat_is_group: boolean
          chat_title: string
          last_msg: string
          last_msg_at: string
          unread_count: number
        }[]
      }
      rpc_list_chats_enhanced: {
        Args: {
          include_archived?: boolean
          limit_n?: number
          offset_n?: number
        }
        Returns: {
          chat_id: string
          chat_type: string
          display_title: string
          is_admin: boolean
          is_archived: boolean
          is_pinned: boolean
          last_activity_at: string
          last_message_content: string
          member_count: number
          unread_count: number
        }[]
      }
      rpc_list_partners: {
        Args: {
          limit_n?: number
          offset_n?: number
          q?: string
          status_filter?: string
        }
        Returns: {
          active_sponsorships: number
          contact_email: string
          contact_name: string
          contact_phone: string
          contract_end_date: string
          contract_start_date: string
          created_at: string
          description: string
          earliest_partnership: string
          id: string
          latest_partnership: string
          name: string
          partnership_type: string
          partnership_value: number
          status: string
          total_count: number
          total_sponsorship_value: number
          total_sponsorships: number
          updated_at: string
        }[]
      }
      rpc_mark_read: {
        Args: { chat: string }
        Returns: undefined
      }
      rpc_partner_analytics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      rpc_save_attendance_batch: {
        Args: { p_entries: Json; p_event_id: string; p_team_id: string }
        Returns: {
          credited: boolean
          player_id: string
          status: string
        }[]
      }
      rpc_save_player_grades: {
        Args: { p_event_id: string; p_items: Json; p_player_id: string }
        Returns: {
          overall: number
        }[]
      }
      rpc_send_message: {
        Args: {
          attachment_name_param?: string
          attachment_size_param?: number
          attachment_url_param?: string
          chat_id_param: string
          content_param: string
          message_type_param?: string
          reply_to_id_param?: string
        }
        Returns: string
      }
      rpc_update_chat: {
        Args: { p_chat_id: string; p_status?: string; p_title?: string }
        Returns: undefined
      }
      rpc_update_chat_meta: {
        Args: { p_chat_id: string; p_new_status?: string; p_new_title?: string }
        Returns: undefined
      }
      rpc_upsert_partner: {
        Args: {
          contact_email?: string
          contact_person?: string
          contact_phone?: string
          contract_end_date?: string
          contract_start_date?: string
          description?: string
          partner_id?: string
          partner_name?: string
          partnership_status?: string
          partnership_type?: string
          partnership_value?: number
        }
        Returns: string
      }
      rpc_upsert_sponsorship: {
        Args: {
          end_date?: string
          partner_org_id?: string
          sponsorship_amount?: number
          sponsorship_id?: string
          sponsorship_status?: string
          sponsorship_type?: string
          start_date?: string
          team_id?: string
        }
        Returns: string
      }
      send_message_idempotent: {
        Args: {
          p_attachment_name?: string
          p_attachment_size?: number
          p_attachment_url?: string
          p_chat_id: string
          p_client_msg_id: string
          p_content: string
          p_message_type?: string
          p_reply_to_id?: string
          p_sender_id: string
        }
        Returns: Json
      }
      shares_team_with: {
        Args: { team_uuid: string; uid: string }
        Returns: boolean
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
      user_is_chat_admin: {
        Args: { chat_uuid: string; user_uuid?: string }
        Returns: boolean
      }
      user_is_chat_participant: {
        Args: { chat_uuid: string; user_uuid?: string }
        Returns: boolean
      }
    }
    Enums: {
      tryout_team: "Gold" | "Black" | "White"
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
      tryout_team: ["Gold", "Black", "White"],
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
