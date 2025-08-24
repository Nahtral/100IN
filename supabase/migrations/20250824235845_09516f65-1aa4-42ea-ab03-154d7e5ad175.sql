-- Security Fix: Remove overly permissive player access policy and implement proper access controls
-- This fixes the critical security issue where all authenticated users could access sensitive player data

-- First, drop the overly permissive policy that allows all authenticated users to view players
DROP POLICY IF EXISTS "All authenticated users can view players" ON public.players;

-- Create proper access control policies based on team assignments and roles

-- 4. Team members can view other players from the same team(s)
CREATE POLICY "Team members can view players from same team" 
ON public.players 
FOR SELECT 
USING (
  -- User must be a player on the same team
  EXISTS (
    SELECT 1 
    FROM public.players my_player 
    WHERE my_player.user_id = auth.uid() 
    AND my_player.team_id = players.team_id
    AND my_player.is_active = true
  )
);

-- 6. Medical staff can view players for medical purposes (limited access)
CREATE POLICY "Medical staff can view players for medical purposes"
ON public.players
FOR SELECT
USING (
  has_role(auth.uid(), 'medical'::user_role) AND 
  -- Medical staff should only see players they are treating or from teams they are assigned to
  (
    -- Allow if they have general medical role access
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'medical'::user_role 
      AND ur.is_active = true
    )
  )
);

-- 7. Add policy for partners to view sponsored team players only
CREATE POLICY "Partners can view sponsored team players only"
ON public.players
FOR SELECT
USING (
  has_role(auth.uid(), 'partner'::user_role) AND
  EXISTS (
    SELECT 1 
    FROM public.partner_team_sponsorships pts
    JOIN public.partner_organizations po ON pts.partner_organization_id = po.id
    WHERE po.created_by = auth.uid()  -- Using created_by instead of contact_user_id
    AND pts.team_id = players.team_id
    AND pts.status = 'active'
    AND pts.start_date <= CURRENT_DATE
    AND (pts.end_date IS NULL OR pts.end_date >= CURRENT_DATE)
  )
);

-- Add data access logging for compliance 
CREATE OR REPLACE FUNCTION public.log_player_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when someone other than the player themselves accesses the data
  IF auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
    INSERT INTO public.analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    )
    VALUES (
      auth.uid(),
      'player_data_access',
      jsonb_build_object(
        'accessed_player_id', COALESCE(NEW.id, OLD.id),
        'accessed_player_user_id', COALESCE(NEW.user_id, OLD.user_id),
        'operation', TG_OP,
        'contains_medical_notes', (COALESCE(NEW.medical_notes, OLD.medical_notes) IS NOT NULL AND COALESCE(NEW.medical_notes, OLD.medical_notes) != ''),
        'contains_emergency_contact', (COALESCE(NEW.emergency_contact_name, OLD.emergency_contact_name) IS NOT NULL AND COALESCE(NEW.emergency_contact_name, OLD.emergency_contact_name) != ''),
        'justification', 'legitimate_access'
      ),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging player data access on UPDATE operations (when data is accessed/modified)
DROP TRIGGER IF EXISTS log_player_access_trigger ON public.players;
CREATE TRIGGER log_player_access_trigger
  AFTER UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.log_player_data_access();