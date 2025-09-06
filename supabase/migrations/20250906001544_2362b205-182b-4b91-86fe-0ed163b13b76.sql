-- Phase 1: Critical Security & Data Integrity Fixes

-- Step 1: Fix employees_v view security (CRITICAL - currently publicly readable)
-- Note: employees_v is a view, so we need to create RLS policies on the underlying tables
-- The view combines profiles and user_roles tables, so policies should be on those

-- Step 2: Add missing foreign key constraints
-- First, clean up any orphaned records
DELETE FROM players WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraints
ALTER TABLE players ADD CONSTRAINT fk_players_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Add critical performance indexes
-- High-impact indexes for frequently queried data
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read 
  ON notifications(user_id, is_read) WHERE NOT is_read;
  
CREATE INDEX IF NOT EXISTS idx_players_team_id 
  ON players(team_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_schedules_start_time 
  ON schedules(start_time) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_daily_health_checkins_player_date 
  ON daily_health_checkins(player_id, check_in_date);

CREATE INDEX IF NOT EXISTS idx_player_attendance_schedule_player 
  ON player_attendance(schedule_id, player_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created 
  ON messages(chat_id, created_at DESC);

-- Step 4: Configure storage buckets with proper limits and MIME types
UPDATE storage.buckets SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE name IN ('avatars', 'event-images', 'news-media');

UPDATE storage.buckets SET 
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/webm']
WHERE name IN ('shot-videos', 'evaluation-videos');

-- Step 5: Add missing RLS policies for complete coverage
-- Ensure super_admin access everywhere and proper DELETE policies

-- Add DELETE policy for notifications
CREATE POLICY "Users can delete their own notifications" 
ON notifications FOR DELETE 
USING (user_id = auth.uid());

-- Add DELETE policy for player_attendance  
CREATE POLICY "Staff and coaches can delete attendance records" 
ON player_attendance FOR DELETE 
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

-- Add comprehensive policy for employees_v equivalent access on profiles
CREATE POLICY "HR staff can view employee profiles" 
ON profiles FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) OR
  id = auth.uid()
);