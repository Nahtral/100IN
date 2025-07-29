import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { evaluationId, videoPath } = await req.json();

    console.log('Analyzing video for evaluation:', evaluationId, 'at path:', videoPath);

    // Simulate AI video analysis processing time
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Mock AI analysis results - in a real implementation, this would call actual AI services
    const analysisResults = {
      shooting_score: Math.floor(Math.random() * 40) + 60, // 60-100
      passing_score: Math.floor(Math.random() * 40) + 60,
      dribbling_score: Math.floor(Math.random() * 40) + 60,
      foot_speed_score: Math.floor(Math.random() * 40) + 60,
      vertical_jump_score: Math.floor(Math.random() * 40) + 60,
      movement_score: Math.floor(Math.random() * 40) + 60,
      body_alignment_score: Math.floor(Math.random() * 40) + 60,
      injury_risk_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      feedback: `AI Analysis: The player demonstrates good fundamental skills with room for improvement in technique refinement. Key observations include proper stance and follow-through, with opportunities to enhance shooting accuracy through improved form consistency. Movement patterns show good athleticism with areas for defensive positioning improvement.`,
      development_plan: `Recommended Development Plan:
1. Focus on shooting form - practice 100 shots daily with emphasis on consistent follow-through
2. Improve passing accuracy through cone drills and partner exercises
3. Enhance dribbling control with weak-hand development sessions
4. Increase foot speed through ladder drills and sprint intervals
5. Strengthen core muscles for better body alignment and injury prevention
6. Practice defensive positioning and movement patterns`,
      analysis_data: {
        confidence_scores: {
          shooting: 0.92,
          passing: 0.88,
          dribbling: 0.85,
          movement: 0.90
        },
        technical_notes: [
          "Consistent shooting form observed",
          "Good ball control during dribbling sequences",
          "Room for improvement in passing accuracy under pressure",
          "Strong athletic foundation with good movement mechanics"
        ]
      }
    };

    // Update the evaluation record with analysis results
    const { error: updateError } = await supabase
      .from('evaluations')
      .update({
        analysis_status: 'completed',
        analysis_data: analysisResults.analysis_data,
        shooting_score: analysisResults.shooting_score,
        passing_score: analysisResults.passing_score,
        dribbling_score: analysisResults.dribbling_score,
        foot_speed_score: analysisResults.foot_speed_score,
        vertical_jump_score: analysisResults.vertical_jump_score,
        movement_score: analysisResults.movement_score,
        body_alignment_score: analysisResults.body_alignment_score,
        injury_risk_level: analysisResults.injury_risk_level,
        feedback: analysisResults.feedback,
        development_plan: analysisResults.development_plan,
        updated_at: new Date().toISOString()
      })
      .eq('id', evaluationId);

    if (updateError) {
      console.error('Error updating evaluation:', updateError);
      throw updateError;
    }

    console.log('Video analysis completed successfully for evaluation:', evaluationId);

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysisResults 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-video-technique function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});