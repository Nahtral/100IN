-- Create shots table for tracking individual shots
CREATE TABLE public.shots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  game_id UUID,
  session_id UUID,
  x_coordinate NUMERIC NOT NULL,
  y_coordinate NUMERIC NOT NULL,
  region TEXT NOT NULL,
  shot_result TEXT NOT NULL CHECK (shot_result IN ('make', 'miss')),
  shot_type TEXT NOT NULL CHECK (shot_type IN ('2PT', '3PT', 'FT')),
  shot_subtype TEXT, -- layup, mid-range, corner-3, etc.
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create court regions lookup table
CREATE TABLE public.court_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_name TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL UNIQUE,
  shot_type TEXT NOT NULL CHECK (shot_type IN ('2PT', '3PT')),
  region_bounds JSONB NOT NULL, -- stores x,y boundaries for the region
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert standard basketball court regions
INSERT INTO public.court_regions (region_name, region_code, shot_type, region_bounds) VALUES
  ('Restricted Area', 'RA', '2PT', '{"type": "circle", "centerX": 400, "centerY": 530, "radius": 40}'),
  ('Paint Center', 'PC', '2PT', '{"type": "rectangle", "x1": 320, "y1": 450, "x2": 480, "y2": 530}'),
  ('Paint Left', 'PL', '2PT', '{"type": "rectangle", "x1": 240, "y1": 450, "x2": 320, "y2": 530}'),
  ('Paint Right', 'PR', '2PT', '{"type": "rectangle", "x1": 480, "y1": 450, "x2": 560, "y2": 530}'),
  ('Mid-Range Left', 'MRL', '2PT', '{"type": "polygon", "points": [[140, 350], [240, 350], [240, 450], [140, 450]]}'),
  ('Mid-Range Right', 'MRR', '2PT', '{"type": "polygon", "points": [[560, 350], [660, 350], [660, 450], [560, 450]]}'),
  ('Mid-Range Top', 'MRT', '2PT', '{"type": "polygon", "points": [[240, 300], [560, 300], [560, 350], [240, 350]]}'),
  ('Corner 3 Left', 'C3L', '3PT', '{"type": "rectangle", "x1": 50, "y1": 450, "x2": 140, "y2": 530}'),
  ('Corner 3 Right', 'C3R', '3PT', '{"type": "rectangle", "x1": 660, "y1": 450, "x2": 750, "y2": 530}'),
  ('Wing 3 Left', 'W3L', '3PT', '{"type": "polygon", "points": [[120, 280], [200, 280], [240, 350], [140, 350]]}'),
  ('Wing 3 Right', 'W3R', '3PT', '{"type": "polygon", "points": [[600, 280], [680, 280], [660, 350], [560, 350]]}'),
  ('Above Break 3', 'AB3', '3PT', '{"type": "polygon", "points": [[200, 200], [600, 200], [560, 300], [240, 300]]}'),
  ('Logo/Half Court', 'LOGO', '3PT', '{"type": "rectangle", "x1": 200, "y1": 50, "x2": 600, "y2": 200}');

-- Create shot analytics view for quick stats
CREATE OR REPLACE VIEW public.shot_analytics AS
SELECT 
  region,
  shot_type,
  COUNT(*) as attempts,
  COUNT(*) FILTER (WHERE shot_result = 'make') as makes,
  ROUND(
    (COUNT(*) FILTER (WHERE shot_result = 'make')::DECIMAL / COUNT(*)) * 100, 2
  ) as fg_percentage,
  CASE 
    WHEN shot_type = '3PT' THEN 
      ROUND(
        (COUNT(*) FILTER (WHERE shot_result = 'make')::DECIMAL / COUNT(*)) * 150, 2
      )
    ELSE 
      ROUND(
        (COUNT(*) FILTER (WHERE shot_result = 'make')::DECIMAL / COUNT(*)) * 200, 2
      )
  END as effective_fg_percentage
FROM public.shots
GROUP BY region, shot_type;

-- Enable RLS
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_regions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shots
CREATE POLICY "Players can view their own shots" ON public.shots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = shots.player_id 
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and coaches can view team shots" ON public.shots
  FOR SELECT USING (
    has_role(auth.uid(), 'staff'::user_role) OR 
    has_role(auth.uid(), 'coach'::user_role) OR 
    is_super_admin(auth.uid())
  );

CREATE POLICY "Authorized users can insert shots" ON public.shots
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'staff'::user_role) OR 
    has_role(auth.uid(), 'coach'::user_role) OR 
    is_super_admin(auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = shots.player_id 
      AND players.user_id = auth.uid()
    ))
  );

CREATE POLICY "Authorized users can update shots" ON public.shots
  FOR UPDATE USING (
    has_role(auth.uid(), 'staff'::user_role) OR 
    has_role(auth.uid(), 'coach'::user_role) OR 
    is_super_admin(auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = shots.player_id 
      AND players.user_id = auth.uid()
    ))
  );

-- RLS Policies for court regions
CREATE POLICY "All authenticated users can view court regions" ON public.court_regions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage court regions" ON public.court_regions
  FOR ALL USING (is_super_admin(auth.uid()));

-- Create function to determine shot region based on coordinates
CREATE OR REPLACE FUNCTION public.determine_shot_region(x_coord NUMERIC, y_coord NUMERIC)
RETURNS TEXT AS $$
DECLARE
  region_record RECORD;
  region_bounds JSONB;
BEGIN
  -- Check each region to see if the shot coordinates fall within its bounds
  FOR region_record IN SELECT region_code, region_bounds FROM court_regions LOOP
    region_bounds := region_record.region_bounds;
    
    -- Handle different region shape types
    IF region_bounds->>'type' = 'circle' THEN
      IF SQRT(
        POWER(x_coord - (region_bounds->>'centerX')::NUMERIC, 2) + 
        POWER(y_coord - (region_bounds->>'centerY')::NUMERIC, 2)
      ) <= (region_bounds->>'radius')::NUMERIC THEN
        RETURN region_record.region_code;
      END IF;
    ELSIF region_bounds->>'type' = 'rectangle' THEN
      IF x_coord >= (region_bounds->>'x1')::NUMERIC 
         AND x_coord <= (region_bounds->>'x2')::NUMERIC
         AND y_coord >= (region_bounds->>'y1')::NUMERIC 
         AND y_coord <= (region_bounds->>'y2')::NUMERIC THEN
        RETURN region_record.region_code;
      END IF;
    END IF;
  END LOOP;
  
  -- Default to mid-range if no specific region found
  RETURN 'MRT';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-determine region on insert
CREATE OR REPLACE FUNCTION public.auto_determine_shot_region()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-determine if region is not already set
  IF NEW.region IS NULL OR NEW.region = '' THEN
    NEW.region := determine_shot_region(NEW.x_coordinate, NEW.y_coordinate);
  END IF;
  
  -- Auto-determine shot type based on region if not set
  IF NEW.shot_type IS NULL OR NEW.shot_type = '' THEN
    SELECT shot_type INTO NEW.shot_type 
    FROM court_regions 
    WHERE region_code = NEW.region;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_determine_shot_region
  BEFORE INSERT ON public.shots
  FOR EACH ROW
  EXECUTE FUNCTION auto_determine_shot_region();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shots_updated_at
  BEFORE UPDATE ON public.shots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();