-- Step 1: Create function to calculate overall grade from individual skill scores
CREATE OR REPLACE FUNCTION public.calculate_overall_grade(
  shooting numeric DEFAULT 0,
  ball_handling numeric DEFAULT 0,
  passing numeric DEFAULT 0,
  rebounding numeric DEFAULT 0,
  footwork numeric DEFAULT 0,
  decision_making numeric DEFAULT 0,
  consistency numeric DEFAULT 0,
  communication numeric DEFAULT 0,
  cutting numeric DEFAULT 0,
  teammate_support numeric DEFAULT 0,
  competitiveness numeric DEFAULT 0,
  coachable numeric DEFAULT 0,
  leadership numeric DEFAULT 0,
  reaction_time numeric DEFAULT 0,
  game_iq numeric DEFAULT 0,
  boxout_frequency numeric DEFAULT 0,
  court_vision numeric DEFAULT 0
) RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_score numeric := 0;
  skill_count integer := 0;
BEGIN
  -- Count non-null skills and sum their values
  IF shooting IS NOT NULL THEN
    total_score := total_score + shooting;
    skill_count := skill_count + 1;
  END IF;
  
  IF ball_handling IS NOT NULL THEN
    total_score := total_score + ball_handling;
    skill_count := skill_count + 1;
  END IF;
  
  IF passing IS NOT NULL THEN
    total_score := total_score + passing;
    skill_count := skill_count + 1;
  END IF;
  
  IF rebounding IS NOT NULL THEN
    total_score := total_score + rebounding;
    skill_count := skill_count + 1;
  END IF;
  
  IF footwork IS NOT NULL THEN
    total_score := total_score + footwork;
    skill_count := skill_count + 1;
  END IF;
  
  IF decision_making IS NOT NULL THEN
    total_score := total_score + decision_making;
    skill_count := skill_count + 1;
  END IF;
  
  IF consistency IS NOT NULL THEN
    total_score := total_score + consistency;
    skill_count := skill_count + 1;
  END IF;
  
  IF communication IS NOT NULL THEN
    total_score := total_score + communication;
    skill_count := skill_count + 1;
  END IF;
  
  IF cutting IS NOT NULL THEN
    total_score := total_score + cutting;
    skill_count := skill_count + 1;
  END IF;
  
  IF teammate_support IS NOT NULL THEN
    total_score := total_score + teammate_support;
    skill_count := skill_count + 1;
  END IF;
  
  IF competitiveness IS NOT NULL THEN
    total_score := total_score + competitiveness;
    skill_count := skill_count + 1;
  END IF;
  
  IF coachable IS NOT NULL THEN
    total_score := total_score + coachable;
    skill_count := skill_count + 1;
  END IF;
  
  IF leadership IS NOT NULL THEN
    total_score := total_score + leadership;
    skill_count := skill_count + 1;
  END IF;
  
  IF reaction_time IS NOT NULL THEN
    total_score := total_score + reaction_time;
    skill_count := skill_count + 1;
  END IF;
  
  IF game_iq IS NOT NULL THEN
    total_score := total_score + game_iq;
    skill_count := skill_count + 1;
  END IF;
  
  IF boxout_frequency IS NOT NULL THEN
    total_score := total_score + boxout_frequency;
    skill_count := skill_count + 1;
  END IF;
  
  IF court_vision IS NOT NULL THEN
    total_score := total_score + court_vision;
    skill_count := skill_count + 1;
  END IF;
  
  -- Return average grade (0 if no skills graded)
  IF skill_count > 0 THEN
    RETURN ROUND(total_score / skill_count, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Step 2: Create trigger function to automatically update overall_grade
CREATE OR REPLACE FUNCTION public.update_overall_grade_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate and set the overall grade
  NEW.overall_grade := public.calculate_overall_grade(
    NEW.shooting,
    NEW.ball_handling,
    NEW.passing,
    NEW.rebounding,
    NEW.footwork,
    NEW.decision_making,
    NEW.consistency,
    NEW.communication,
    NEW.cutting,
    NEW.teammate_support,
    NEW.competitiveness,
    NEW.coachable,
    NEW.leadership,
    NEW.reaction_time,
    NEW.game_iq,
    NEW.boxout_frequency,
    NEW.court_vision
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the trigger on event_player_grades table
DROP TRIGGER IF EXISTS update_overall_grade_on_event_player_grades ON public.event_player_grades;
CREATE TRIGGER update_overall_grade_on_event_player_grades
  BEFORE INSERT OR UPDATE ON public.event_player_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_overall_grade_trigger();

-- Step 4: Enable real-time updates for event_player_grades table
ALTER TABLE public.event_player_grades REPLICA IDENTITY FULL;

-- Step 5: Add event_player_grades to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_player_grades;