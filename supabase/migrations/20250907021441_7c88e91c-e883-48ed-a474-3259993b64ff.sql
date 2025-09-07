-- Add performance indexes for production readiness
-- These indexes will significantly improve query performance on hot paths

-- Index for user roles lookup (critical for authentication/authorization)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active 
ON public.user_roles (user_id, is_active) 
WHERE is_active = true;

-- Index for user roles by role type (for role-based queries)
CREATE INDEX IF NOT EXISTS idx_user_roles_role_active 
ON public.user_roles (role, is_active) 
WHERE is_active = true;

-- Index for profiles approval status (for user management)
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status 
ON public.profiles (approval_status) 
WHERE approval_status = 'approved';

-- Index for schedules by date range (for schedule queries)
CREATE INDEX IF NOT EXISTS idx_schedules_start_time_status 
ON public.schedules (start_time, status) 
WHERE status = 'active';

-- Index for player attendance by schedule
CREATE INDEX IF NOT EXISTS idx_player_attendance_schedule_status 
ON public.player_attendance (schedule_id, status);

-- Index for players by team and status
CREATE INDEX IF NOT EXISTS idx_players_team_active 
ON public.players (team_id, is_active) 
WHERE is_active = true;

-- Index for notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read, created_at) 
WHERE is_read = false;

-- Index for analytics events by type and date
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date 
ON public.analytics_events (event_type, created_at);

-- Index for error logs by severity and date
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_date 
ON public.error_logs (severity, created_at);

-- Index for chat messages by chat and timestamp
CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp 
ON public.messages (chat_id, created_at DESC);

-- Composite index for employee data access logging
CREATE INDEX IF NOT EXISTS idx_employees_status_user 
ON public.employees (employment_status, user_id) 
WHERE employment_status = 'active';