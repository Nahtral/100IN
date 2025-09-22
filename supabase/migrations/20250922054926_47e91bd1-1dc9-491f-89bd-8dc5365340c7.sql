-- Create SECURITY DEFINER RPCs for Exposure Portal
-- These functions handle data access with proper security

-- RPC for upserting institutions
CREATE OR REPLACE FUNCTION public.rpc_upsert_institution(
  p_institution JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  institution_id UUID;
BEGIN
  -- Only super admins can upsert institutions
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can manage institutions';
  END IF;

  INSERT INTO public.institutions (
    name, country, level, is_private, state_province, city, website,
    boarding_available, conference, athletics_division, enrollment_size,
    gpa_range, sat_range, international_admissions, data_source, source_ref,
    last_verified_at, metadata
  ) VALUES (
    (p_institution->>'name')::TEXT,
    (p_institution->>'country')::exposure_country,
    (p_institution->>'level')::education_level,
    (p_institution->>'is_private')::BOOLEAN,
    (p_institution->>'state_province')::TEXT,
    (p_institution->>'city')::TEXT,
    (p_institution->>'website')::TEXT,
    COALESCE((p_institution->>'boarding_available')::BOOLEAN, false),
    (p_institution->>'conference')::TEXT,
    (p_institution->>'athletics_division')::TEXT,
    (p_institution->>'enrollment_size')::INTEGER,
    (p_institution->'gpa_range')::JSONB,
    (p_institution->'sat_range')::JSONB,
    COALESCE((p_institution->>'international_admissions')::BOOLEAN, false),
    (p_institution->>'data_source')::TEXT,
    (p_institution->>'source_ref')::TEXT,
    COALESCE((p_institution->>'last_verified_at')::TIMESTAMPTZ, NOW()),
    COALESCE((p_institution->'metadata')::JSONB, '{}'::JSONB)
  )
  ON CONFLICT (data_source, source_ref) 
  WHERE source_ref IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    level = EXCLUDED.level,
    is_private = EXCLUDED.is_private,
    state_province = EXCLUDED.state_province,
    city = EXCLUDED.city,
    website = EXCLUDED.website,
    boarding_available = EXCLUDED.boarding_available,
    conference = EXCLUDED.conference,
    athletics_division = EXCLUDED.athletics_division,
    enrollment_size = EXCLUDED.enrollment_size,
    gpa_range = EXCLUDED.gpa_range,
    sat_range = EXCLUDED.sat_range,
    international_admissions = EXCLUDED.international_admissions,
    last_verified_at = EXCLUDED.last_verified_at,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO institution_id;

  RETURN institution_id;
END;
$$;

-- RPC for upserting contacts
CREATE OR REPLACE FUNCTION public.rpc_upsert_contact(
  p_contact JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_id UUID;
BEGIN
  -- Only super admins can upsert contacts
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can manage contacts';
  END IF;

  INSERT INTO public.contacts (
    institution_id, department_id, first_name, last_name, title, email, phone,
    office_location, is_primary, verification_status, data_source,
    last_verified_at, metadata
  ) VALUES (
    (p_contact->>'institution_id')::UUID,
    (p_contact->>'department_id')::UUID,
    (p_contact->>'first_name')::TEXT,
    (p_contact->>'last_name')::TEXT,
    (p_contact->>'title')::TEXT,
    (p_contact->>'email')::TEXT,
    (p_contact->>'phone')::TEXT,
    (p_contact->>'office_location')::TEXT,
    COALESCE((p_contact->>'is_primary')::BOOLEAN, false),
    COALESCE((p_contact->>'verification_status')::verification_status, 'verified'),
    (p_contact->>'data_source')::TEXT,
    COALESCE((p_contact->>'last_verified_at')::TIMESTAMPTZ, NOW()),
    COALESCE((p_contact->'metadata')::JSONB, '{}'::JSONB)
  )
  ON CONFLICT (institution_id, email) 
  WHERE email IS NOT NULL
  DO UPDATE SET
    department_id = EXCLUDED.department_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    title = EXCLUDED.title,
    phone = EXCLUDED.phone,
    office_location = EXCLUDED.office_location,
    is_primary = EXCLUDED.is_primary,
    verification_status = EXCLUDED.verification_status,
    last_verified_at = EXCLUDED.last_verified_at,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO contact_id;

  RETURN contact_id;
END;
$$;

-- RPC for searching contacts with filters
CREATE OR REPLACE FUNCTION public.rpc_search_contacts(
  p_filters JSONB DEFAULT '{}'::JSONB,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  institution_id UUID,
  institution_name TEXT,
  institution_level education_level,
  institution_country exposure_country,
  state_province TEXT,
  city TEXT,
  conference TEXT,
  department_id UUID,
  department_name TEXT,
  department_category department_category,
  sport TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  verification_status verification_status,
  last_verified_at TIMESTAMPTZ,
  data_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can search contacts
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can search contacts';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    i.id as institution_id,
    i.name as institution_name,
    i.level as institution_level,
    i.country as institution_country,
    i.state_province,
    i.city,
    i.conference,
    d.id as department_id,
    d.name as department_name,
    d.category as department_category,
    d.sport,
    c.first_name as contact_first_name,
    c.last_name as contact_last_name,
    c.title as contact_title,
    c.email as contact_email,
    c.phone as contact_phone,
    c.verification_status,
    c.last_verified_at,
    c.data_source
  FROM public.contacts c
  JOIN public.institutions i ON c.institution_id = i.id
  LEFT JOIN public.departments d ON c.department_id = d.id
  WHERE 
    (NOT (p_filters ? 'country') OR i.country = (p_filters->>'country')::exposure_country) AND
    (NOT (p_filters ? 'level') OR i.level = (p_filters->>'level')::education_level) AND
    (NOT (p_filters ? 'state_province') OR i.state_province = (p_filters->>'state_province')) AND
    (NOT (p_filters ? 'sport') OR d.sport ILIKE '%' || (p_filters->>'sport') || '%') AND
    (NOT (p_filters ? 'department_category') OR d.category = (p_filters->>'department_category')::department_category) AND
    (NOT (p_filters ? 'verification_status') OR c.verification_status = (p_filters->>'verification_status')::verification_status) AND
    (NOT (p_filters ? 'search_term') OR 
      (i.name ILIKE '%' || (p_filters->>'search_term') || '%' OR
       c.first_name ILIKE '%' || (p_filters->>'search_term') || '%' OR
       c.last_name ILIKE '%' || (p_filters->>'search_term') || '%' OR
       c.title ILIKE '%' || (p_filters->>'search_term') || '%'))
  ORDER BY 
    CASE WHEN (p_filters->>'sort_by') = 'institution_name' THEN i.name END ASC,
    CASE WHEN (p_filters->>'sort_by') = 'last_verified' THEN c.last_verified_at END DESC,
    i.name ASC, c.last_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- RPC for sending outreach
CREATE OR REPLACE FUNCTION public.rpc_send_outreach(
  p_outreach JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  outreach_id UUID;
  message_id UUID;
  player_id UUID;
BEGIN
  -- Only super admins can send outreach
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can send outreach';
  END IF;

  -- Create outreach record
  INSERT INTO public.outreach (
    created_by, institution_id, contact_id, template_id, subject, body_html,
    sent_via, status, scheduled_for, list_id, sequence_id, metadata
  ) VALUES (
    auth.uid(),
    (p_outreach->>'institution_id')::UUID,
    (p_outreach->>'contact_id')::UUID,
    (p_outreach->>'template_id')::UUID,
    (p_outreach->>'subject')::TEXT,
    (p_outreach->>'body_html')::TEXT,
    COALESCE((p_outreach->>'sent_via')::TEXT, 'smtp'),
    COALESCE((p_outreach->>'status')::outreach_status, 'queued'),
    (p_outreach->>'scheduled_for')::TIMESTAMPTZ,
    (p_outreach->>'list_id')::UUID,
    (p_outreach->>'sequence_id')::UUID,
    COALESCE((p_outreach->'metadata')::JSONB, '{}'::JSONB)
  ) RETURNING id INTO outreach_id;

  -- Create outreach message
  INSERT INTO public.outreach_messages (
    outreach_id, to_email, to_name, cc_emails, bcc_emails, attachments
  ) VALUES (
    outreach_id,
    (p_outreach->>'to_email')::TEXT,
    (p_outreach->>'to_name')::TEXT,
    (p_outreach->'cc_emails')::TEXT[],
    (p_outreach->'bcc_emails')::TEXT[],
    COALESCE((p_outreach->'attachments')::JSONB, '[]'::JSONB)
  ) RETURNING id INTO message_id;

  -- Link players to outreach
  IF p_outreach ? 'player_ids' THEN
    FOR player_id IN SELECT value::UUID FROM jsonb_array_elements_text(p_outreach->'player_ids')
    LOOP
      INSERT INTO public.outreach_players (outreach_id, player_id, included_data)
      VALUES (outreach_id, player_id, '{}'::JSONB);
    END LOOP;
  END IF;

  RETURN outreach_id;
END;
$$;

-- RPC for getting player profile data for outreach
CREATE OR REPLACE FUNCTION public.rpc_get_player_profile_data(
  p_player_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data JSONB;
BEGIN
  -- Only super admins can access player profile data
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can access player profile data';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', pr.full_name,
    'email', pr.email,
    'phone', pr.phone,
    'gpa', p.gpa,
    'sat_score', p.sat_score,
    'graduation_year', p.graduation_year,
    'sport', 'Basketball', -- Default sport
    'position', p.position,
    'height', p.height,
    'weight', p.weight,
    'high_school', p.high_school,
    'jersey_number', p.jersey_number,
    'highlights_url', p.highlights_url,
    'academic_transcripts', p.academic_transcripts,
    'created_at', p.created_at
  ) INTO profile_data
  FROM public.players p
  JOIN public.profiles pr ON p.user_id = pr.id
  WHERE p.id = p_player_id;

  RETURN COALESCE(profile_data, '{}'::JSONB);
END;
$$;

-- Function to log audit trail
CREATE OR REPLACE FUNCTION public.log_exposure_audit(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.exposure_audit_log (
    user_id, action, resource_type, resource_id, details, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;