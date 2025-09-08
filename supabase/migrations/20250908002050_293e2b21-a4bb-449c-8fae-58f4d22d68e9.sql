-- Create partner_notes table for communication
CREATE TABLE IF NOT EXISTS public.partner_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_organization_id UUID REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  sponsorship_id UUID REFERENCES public.partner_team_sponsorships(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  note_body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT note_has_reference CHECK (
    (partner_organization_id IS NOT NULL AND sponsorship_id IS NULL) OR
    (partner_organization_id IS NULL AND sponsorship_id IS NOT NULL)
  )
);

-- Create partner_contacts table for contact management
CREATE TABLE IF NOT EXISTS public.partner_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_organization_id UUID NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.partner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_notes
CREATE POLICY "Super admins can manage all partner notes" 
ON public.partner_notes 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view partner notes" 
ON public.partner_notes 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'partner'::user_role));

-- RLS policies for partner_contacts
CREATE POLICY "Super admins can manage all partner contacts" 
ON public.partner_contacts 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff and partners can view contacts" 
ON public.partner_contacts 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'partner'::user_role));

-- Create view for partner summary data using correct column names
CREATE OR REPLACE VIEW public.v_partner_summary AS
SELECT 
  po.id,
  po.name,
  po.partnership_type,
  po.partnership_status as status,
  po.contact_person as contact_name,
  po.contact_email,
  po.contact_phone,
  po.description,
  po.partnership_value,
  po.contract_start_date,
  po.contract_end_date,
  po.created_at,
  po.updated_at,
  COALESCE(SUM(pts.sponsorship_amount), 0) as total_sponsorship_value,
  COUNT(pts.id) as total_sponsorships,
  COUNT(pts.id) FILTER (WHERE pts.status = 'active') as active_sponsorships,
  MIN(pts.start_date) as earliest_partnership,
  MAX(pts.end_date) as latest_partnership
FROM public.partner_organizations po
LEFT JOIN public.partner_team_sponsorships pts ON po.id = pts.partner_organization_id
GROUP BY po.id, po.name, po.partnership_type, po.partnership_status, po.contact_person, 
         po.contact_email, po.contact_phone, po.description, po.partnership_value,
         po.contract_start_date, po.contract_end_date, po.created_at, po.updated_at;

-- Create RPC for listing partners with pagination and filters
CREATE OR REPLACE FUNCTION public.rpc_list_partners(
  q TEXT DEFAULT '',
  status_filter TEXT DEFAULT '',
  limit_n INTEGER DEFAULT 25,
  offset_n INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  partnership_type TEXT,
  status TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description TEXT,
  partnership_value NUMERIC,
  contract_start_date DATE,
  contract_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  total_sponsorship_value NUMERIC,
  total_sponsorships BIGINT,
  active_sponsorships BIGINT,
  earliest_partnership DATE,
  latest_partnership DATE,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_records BIGINT;
BEGIN
  -- Only super admins can access this function
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only super admins can list partners';
  END IF;

  -- Get total count for pagination
  SELECT COUNT(*) INTO total_records
  FROM public.v_partner_summary vps
  WHERE (q = '' OR vps.name ILIKE '%' || q || '%' OR vps.contact_name ILIKE '%' || q || '%')
    AND (status_filter = '' OR vps.status = status_filter);

  -- Return paginated results
  RETURN QUERY
  SELECT 
    vps.id,
    vps.name,
    vps.partnership_type,
    vps.status,
    vps.contact_name,
    vps.contact_email,
    vps.contact_phone,
    vps.description,
    vps.partnership_value,
    vps.contract_start_date,
    vps.contract_end_date,
    vps.created_at,
    vps.updated_at,
    vps.total_sponsorship_value,
    vps.total_sponsorships,
    vps.active_sponsorships,
    vps.earliest_partnership,
    vps.latest_partnership,
    total_records as total_count
  FROM public.v_partner_summary vps
  WHERE (q = '' OR vps.name ILIKE '%' || q || '%' OR vps.contact_name ILIKE '%' || q || '%')
    AND (status_filter = '' OR vps.status = status_filter)
  ORDER BY vps.created_at DESC
  LIMIT limit_n
  OFFSET offset_n;
END;
$$;

-- Create RPC for upserting partners
CREATE OR REPLACE FUNCTION public.rpc_upsert_partner(
  partner_id UUID DEFAULT NULL,
  partner_name TEXT DEFAULT '',
  partnership_type TEXT DEFAULT 'sponsor',
  partnership_status TEXT DEFAULT 'active',
  contact_person TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  description TEXT DEFAULT '',
  partnership_value NUMERIC DEFAULT 0,
  contract_start_date DATE DEFAULT NULL,
  contract_end_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Only super admins can upsert partners
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only super admins can manage partners';
  END IF;

  IF partner_id IS NULL THEN
    -- Insert new partner
    INSERT INTO public.partner_organizations (
      name, partnership_type, partnership_status, contact_person, contact_email, 
      contact_phone, description, partnership_value, contract_start_date, 
      contract_end_date, created_by
    )
    VALUES (
      partner_name, partnership_type, partnership_status, contact_person, 
      contact_email, contact_phone, description, partnership_value, 
      contract_start_date, contract_end_date, auth.uid()
    )
    RETURNING id INTO result_id;
  ELSE
    -- Update existing partner
    UPDATE public.partner_organizations
    SET 
      name = partner_name,
      partnership_type = partnership_type,
      partnership_status = partnership_status,
      contact_person = contact_person,
      contact_email = contact_email,
      contact_phone = contact_phone,
      description = description,
      partnership_value = partnership_value,
      contract_start_date = contract_start_date,
      contract_end_date = contract_end_date,
      updated_at = now()
    WHERE id = partner_id
    RETURNING id INTO result_id;
  END IF;

  RETURN result_id;
END;
$$;

-- Create RPC for upserting sponsorships
CREATE OR REPLACE FUNCTION public.rpc_upsert_sponsorship(
  sponsorship_id UUID DEFAULT NULL,
  partner_org_id UUID DEFAULT NULL,
  team_id UUID DEFAULT NULL,
  sponsorship_type TEXT DEFAULT 'financial',
  sponsorship_amount NUMERIC DEFAULT 0,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  sponsorship_status TEXT DEFAULT 'active'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Only super admins can upsert sponsorships
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only super admins can manage sponsorships';
  END IF;

  -- Validate dates
  IF start_date IS NOT NULL AND end_date IS NOT NULL AND start_date > end_date THEN
    RAISE EXCEPTION 'Start date cannot be after end date';
  END IF;

  IF sponsorship_id IS NULL THEN
    -- Insert new sponsorship
    INSERT INTO public.partner_team_sponsorships (
      partner_organization_id, team_id, sponsorship_type, 
      sponsorship_amount, start_date, end_date, status
    )
    VALUES (
      partner_org_id, team_id, sponsorship_type, 
      sponsorship_amount, start_date, end_date, sponsorship_status
    )
    RETURNING id INTO result_id;
  ELSE
    -- Update existing sponsorship
    UPDATE public.partner_team_sponsorships
    SET 
      partner_organization_id = partner_org_id,
      team_id = team_id,
      sponsorship_type = sponsorship_type,
      sponsorship_amount = sponsorship_amount,
      start_date = start_date,
      end_date = end_date,
      status = sponsorship_status,
      updated_at = now()
    WHERE id = sponsorship_id
    RETURNING id INTO result_id;
  END IF;

  RETURN result_id;
END;
$$;

-- Create RPC for analytics
CREATE OR REPLACE FUNCTION public.rpc_partner_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Only super admins can access analytics
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only super admins can access partner analytics';
  END IF;

  SELECT json_build_object(
    'total_partners', (SELECT COUNT(*) FROM public.partner_organizations),
    'active_partners', (SELECT COUNT(*) FROM public.partner_organizations WHERE partnership_status = 'active'),
    'total_sponsorships', (SELECT COUNT(*) FROM public.partner_team_sponsorships),
    'active_sponsorships', (SELECT COUNT(*) FROM public.partner_team_sponsorships WHERE status = 'active'),
    'total_sponsorship_value', (SELECT COALESCE(SUM(sponsorship_amount), 0) FROM public.partner_team_sponsorships WHERE status = 'active'),
    'total_partnership_value', (SELECT COALESCE(SUM(partnership_value), 0) FROM public.partner_organizations WHERE partnership_status = 'active'),
    'expiring_in_30_days', (
      SELECT COUNT(*) 
      FROM public.partner_team_sponsorships 
      WHERE status = 'active' 
        AND end_date IS NOT NULL 
        AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ),
    'by_type', (
      SELECT json_agg(
        json_build_object(
          'type', partnership_type,
          'count', count,
          'total_value', total_value
        )
      )
      FROM (
        SELECT 
          po.partnership_type,
          COUNT(po.id) as count,
          COALESCE(SUM(pts.sponsorship_amount), 0) as total_value
        FROM public.partner_organizations po
        LEFT JOIN public.partner_team_sponsorships pts ON po.id = pts.partner_organization_id AND pts.status = 'active'
        GROUP BY po.partnership_type
        ORDER BY total_value DESC
      ) type_stats
    ),
    'expiring_timeline', (
      SELECT json_agg(
        json_build_object(
          'month', to_char(end_date, 'YYYY-MM'),
          'count', count,
          'total_value', total_value
        )
      )
      FROM (
        SELECT 
          DATE_TRUNC('month', end_date) as end_date,
          COUNT(*) as count,
          SUM(sponsorship_amount) as total_value
        FROM public.partner_team_sponsorships
        WHERE status = 'active' 
          AND end_date IS NOT NULL 
          AND end_date >= CURRENT_DATE
          AND end_date <= CURRENT_DATE + INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', end_date)
        ORDER BY end_date
      ) timeline_stats
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Create RPC for adding partner notes
CREATE OR REPLACE FUNCTION public.rpc_add_partner_note(
  partner_id UUID DEFAULT NULL,
  sponsorship_id UUID DEFAULT NULL,
  note_body TEXT DEFAULT '',
  is_internal BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Only super admins and staff can add notes
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to add notes';
  END IF;

  -- Validate that exactly one reference is provided
  IF (partner_id IS NULL AND sponsorship_id IS NULL) OR 
     (partner_id IS NOT NULL AND sponsorship_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Must provide exactly one of partner_id or sponsorship_id';
  END IF;

  -- Insert note
  INSERT INTO public.partner_notes (
    partner_organization_id, sponsorship_id, author_id, note_body, is_internal
  )
  VALUES (
    partner_id, sponsorship_id, auth.uid(), note_body, is_internal
  )
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;