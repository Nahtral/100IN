-- Phase 3: Complete remaining audit fixes

-- Add missing unique constraint for player_attendance if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'player_attendance_player_id_schedule_id_key'
    ) THEN
        ALTER TABLE player_attendance 
        ADD CONSTRAINT player_attendance_player_id_schedule_id_key 
        UNIQUE (player_id, schedule_id);
    END IF;
END $$;

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON teams(coach_id) WHERE coach_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON user_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payments_status_date ON payments(payment_status, payment_date) WHERE payment_status = 'completed';

-- Add missing RLS policy for teams DELETE
CREATE POLICY IF NOT EXISTS "Super admins can delete teams" 
ON teams FOR DELETE 
USING (is_super_admin(auth.uid()));

-- Add missing RLS policy for schedules DELETE  
CREATE POLICY IF NOT EXISTS "Super admins can delete schedules" 
ON schedules FOR DELETE 
USING (is_super_admin(auth.uid()));

-- Add missing RLS policy for players DELETE
CREATE POLICY IF NOT EXISTS "Super admins can delete players" 
ON players FOR DELETE 
USING (is_super_admin(auth.uid()));

-- Ensure storage buckets exist with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('event-images', 'event-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('news-media', 'news-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('shot-videos', 'shot-videos', false, 52428800, ARRAY['video/mp4', 'video/quicktime', 'video/webm']),
  ('evaluation-videos', 'evaluation-videos', false, 52428800, ARRAY['video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Update existing RLS policy to ensure comprehensive coverage
DROP POLICY IF EXISTS "HR staff can view employee profiles" ON profiles;
CREATE POLICY "Comprehensive profile access policy" 
ON profiles FOR SELECT 
USING (
  -- Super admins can see all profiles
  is_super_admin(auth.uid()) OR 
  -- HR staff can see employee profiles
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) OR
  -- Users can see their own profile
  id = auth.uid() OR
  -- Coaches can see their team players' profiles (limited)
  (has_role(auth.uid(), 'coach'::user_role) AND EXISTS (
    SELECT 1 FROM players p 
    JOIN teams t ON p.team_id = t.id 
    WHERE p.user_id = profiles.id AND t.coach_id = auth.uid()
  )) OR
  -- Parents can see their children's profiles
  (has_role(auth.uid(), 'parent'::user_role) AND EXISTS (
    SELECT 1 FROM parent_child_relationships pcr 
    WHERE pcr.child_id = profiles.id AND pcr.parent_id = auth.uid()
  ))
);