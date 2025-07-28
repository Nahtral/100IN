
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('super_admin', 'staff', 'coach', 'player', 'parent', 'medical', 'partner');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  team_id UUID,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age_group TEXT NOT NULL,
  season TEXT NOT NULL,
  coach_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  jersey_number INTEGER,
  position TEXT,
  height TEXT,
  weight TEXT,
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parent-child relationships
CREATE TABLE public.parent_child_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL, -- 'parent', 'guardian', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

-- Create news/updates table
CREATE TABLE public.news_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- 'general', 'team', 'medical', 'schedule'
  team_id UUID REFERENCES public.teams(id),
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player performance table
CREATE TABLE public.player_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  game_date DATE NOT NULL,
  opponent TEXT,
  points INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  field_goals_made INTEGER DEFAULT 0,
  field_goals_attempted INTEGER DEFAULT 0,
  free_throws_made INTEGER DEFAULT 0,
  free_throws_attempted INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- 'game', 'practice', 'meeting', 'event'
  team_id UUID REFERENCES public.teams(id),
  opponent TEXT,
  location TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create health and wellness tracking table
CREATE TABLE public.health_wellness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL,
  body_fat_percentage DECIMAL,
  fitness_score INTEGER,
  injury_status TEXT,
  injury_description TEXT,
  medical_notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_wellness ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  )
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for teams
CREATE POLICY "All authenticated users can view teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Coaches and staff can manage their teams"
  ON public.teams FOR ALL
  USING (
    public.has_role(auth.uid(), 'coach') OR 
    public.has_role(auth.uid(), 'staff') OR 
    public.is_super_admin(auth.uid())
  );

-- RLS Policies for players
CREATE POLICY "Players can view their own data"
  ON public.players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can view their children's data"
  ON public.players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relationships
      WHERE parent_id = auth.uid() AND child_id = user_id
    )
  );

CREATE POLICY "Coaches can view their team players"
  ON public.players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Staff and super admins can manage players"
  ON public.players FOR ALL
  USING (
    public.has_role(auth.uid(), 'staff') OR 
    public.is_super_admin(auth.uid())
  );

-- RLS Policies for news_updates
CREATE POLICY "All authenticated users can view news"
  ON public.news_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff and super admins can manage news"
  ON public.news_updates FOR ALL
  USING (
    public.has_role(auth.uid(), 'staff') OR 
    public.is_super_admin(auth.uid())
  );

-- RLS Policies for player_performance
CREATE POLICY "Players can view their own performance"
  ON public.player_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE id = player_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's performance"
  ON public.player_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.parent_child_relationships pcr ON p.user_id = pcr.child_id
      WHERE p.id = player_id AND pcr.parent_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view their team's performance"
  ON public.player_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.teams t ON p.team_id = t.id
      WHERE p.id = player_id AND t.coach_id = auth.uid()
    )
  );

CREATE POLICY "Staff and coaches can manage performance data"
  ON public.player_performance FOR ALL
  USING (
    public.has_role(auth.uid(), 'staff') OR 
    public.has_role(auth.uid(), 'coach') OR 
    public.is_super_admin(auth.uid())
  );

-- RLS Policies for schedules
CREATE POLICY "All authenticated users can view schedules"
  ON public.schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff and coaches can manage schedules"
  ON public.schedules FOR ALL
  USING (
    public.has_role(auth.uid(), 'staff') OR 
    public.has_role(auth.uid(), 'coach') OR 
    public.is_super_admin(auth.uid())
  );

-- RLS Policies for health_wellness
CREATE POLICY "Players can view their own health data"
  ON public.health_wellness FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE id = player_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's health data"
  ON public.health_wellness FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.parent_child_relationships pcr ON p.user_id = pcr.child_id
      WHERE p.id = player_id AND pcr.parent_id = auth.uid()
    )
  );

CREATE POLICY "Medical team can manage health data"
  ON public.health_wellness FOR ALL
  USING (
    public.has_role(auth.uid(), 'medical') OR 
    public.has_role(auth.uid(), 'staff') OR 
    public.is_super_admin(auth.uid())
  );

-- Create trigger function for updating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers for timestamp columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_updated_at
  BEFORE UPDATE ON public.player_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_updated_at
  BEFORE UPDATE ON public.health_wellness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
