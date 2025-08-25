-- Fix all functions with search_path security warnings
-- Based on the previous functions, let's fix the ones without proper search_path

-- Update determine_shot_region function
CREATE OR REPLACE FUNCTION public.determine_shot_region(_x numeric, _y numeric)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Determine region based on coordinates
  -- Restricted Area (under basket)
  IF (_x BETWEEN 375 AND 425) AND (_y BETWEEN 495 AND 535) THEN
    RETURN 'RA';
  END IF;
  
  -- Paint areas
  IF (_x BETWEEN 340 AND 460) AND (_y BETWEEN 400 AND 520) THEN
    RETURN 'PC';
  ELSIF (_x BETWEEN 240 AND 340) AND (_y BETWEEN 400 AND 520) THEN
    RETURN 'PL';
  ELSIF (_x BETWEEN 460 AND 560) AND (_y BETWEEN 400 AND 520) THEN
    RETURN 'PR';
  END IF;
  
  -- 3-point areas
  IF (_x BETWEEN 60 AND 120) AND (_y BETWEEN 400 AND 520) THEN
    RETURN 'C3L';
  ELSIF (_x BETWEEN 680 AND 740) AND (_y BETWEEN 400 AND 520) THEN
    RETURN 'C3R';
  ELSIF (_x BETWEEN 80 AND 200) AND (_y BETWEEN 180 AND 280) THEN
    RETURN 'W3L';
  ELSIF (_x BETWEEN 600 AND 720) AND (_y BETWEEN 180 AND 280) THEN
    RETURN 'W3R';
  ELSIF (_x BETWEEN 200 AND 600) AND (_y BETWEEN 100 AND 180) THEN
    RETURN 'AB3';
  END IF;
  
  -- Mid-range areas
  IF (_x BETWEEN 120 AND 240) AND (_y BETWEEN 280 AND 400) THEN
    RETURN 'MRL';
  ELSIF (_x BETWEEN 560 AND 680) AND (_y BETWEEN 280 AND 400) THEN
    RETURN 'MRR';
  ELSIF (_x BETWEEN 240 AND 560) AND (_y BETWEEN 220 AND 280) THEN
    RETURN 'MRT';
  END IF;
  
  -- Default to mid-range top if no specific region found
  RETURN 'MRT';
END;
$function$;

-- Update auto_determine_shot_region function  
CREATE OR REPLACE FUNCTION public.auto_determine_shot_region()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-determine region based on court coordinates
  IF NEW.court_x_position IS NOT NULL AND NEW.court_y_position IS NOT NULL THEN
    NEW.region = determine_shot_region(NEW.court_x_position, NEW.court_y_position);
  END IF;
  
  -- Auto-determine shot type based on region if not provided
  IF NEW.shot_type IS NULL THEN
    IF NEW.region IN ('C3L', 'C3R', 'W3L', 'W3R', 'AB3', 'D3L', 'D3R') THEN
      NEW.shot_type = '3PT';
    ELSE
      NEW.shot_type = '2PT';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;