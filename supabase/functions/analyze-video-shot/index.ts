import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoAnalysisData {
  arc_degrees: number;
  depth_inches: number;
  lr_deviation_inches: number;
  made: boolean;
  confidence: number;
  shot_type: string;
  follow_through_quality: number;
  release_angle: number;
  ball_trajectory: {
    peak_height: number;
    entry_angle: number;
  };
  form_analysis: {
    shooting_hand_position: string;
    elbow_alignment: string;
    follow_through: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, playerId, shotId } = await req.json();

    if (!videoUrl || !playerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: videoUrl and playerId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Analyzing video for player:', playerId);
    console.log('Video URL:', videoUrl);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // In a real implementation, this would use computer vision APIs like:
    // - OpenAI GPT-4 Vision
    // - Google Cloud Vision AI
    // - Custom TensorFlow/PyTorch models
    // For now, we'll simulate the analysis

    console.log('Starting video analysis simulation...');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate realistic basketball shot analysis
    const analysisData: VideoAnalysisData = {
      arc_degrees: 45 + (Math.random() - 0.5) * 15, // 37.5 - 52.5 degrees
      depth_inches: (Math.random() - 0.5) * 10, // -5 to +5 inches from rim
      lr_deviation_inches: (Math.random() - 0.5) * 8, // -4 to +4 inches L/R
      made: Math.random() > 0.4, // 60% make rate for simulation
      confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
      shot_type: ['catch-and-shoot', 'pull-up', 'step-back', 'fadeaway'][Math.floor(Math.random() * 4)],
      follow_through_quality: Math.random() * 100,
      release_angle: 45 + (Math.random() - 0.5) * 10,
      ball_trajectory: {
        peak_height: 12 + Math.random() * 4, // 12-16 feet
        entry_angle: 45 + (Math.random() - 0.5) * 10
      },
      form_analysis: {
        shooting_hand_position: ['centered', 'slightly left', 'slightly right'][Math.floor(Math.random() * 3)],
        elbow_alignment: ['good', 'needs improvement', 'excellent'][Math.floor(Math.random() * 3)],
        follow_through: ['complete', 'incomplete', 'excellent'][Math.floor(Math.random() * 3)]
      }
    };

    // Generate coaching feedback based on analysis
    const feedback = generateCoachingFeedback(analysisData);

    console.log('Analysis completed:', analysisData);

    // If shotId is provided, update the existing shot record
    if (shotId) {
      const { error: updateError } = await supabase
        .from('shots')
        .update({
          video_analysis_status: 'completed',
          video_analysis_data: analysisData,
          arc_degrees: analysisData.arc_degrees,
          depth_inches: analysisData.depth_inches,
          lr_deviation_inches: analysisData.lr_deviation_inches,
          made: analysisData.made,
          shot_type: analysisData.shot_type,
          audio_feedback: feedback
        })
        .eq('id', shotId);

      if (updateError) {
        console.error('Error updating shot:', updateError);
        throw updateError;
      }
    } else {
      // Create a new shot record from video analysis
      const { error: insertError } = await supabase
        .from('shots')
        .insert({
          player_id: playerId,
          video_analysis_status: 'completed',
          video_analysis_data: analysisData,
          arc_degrees: analysisData.arc_degrees,
          depth_inches: analysisData.depth_inches,
          lr_deviation_inches: analysisData.lr_deviation_inches,
          made: analysisData.made,
          shot_type: analysisData.shot_type,
          audio_feedback: feedback,
          video_url: videoUrl
        });

      if (insertError) {
        console.error('Error creating shot record:', insertError);
        throw insertError;
      }
    }

    // Create notification for the player
    const { error: notificationError } = await supabase.rpc('create_notification', {
      target_user_id: playerId,
      notification_type: 'video_analysis_complete',
      notification_title: 'Video Analysis Complete',
      notification_message: `Your shot analysis is ready! ${analysisData.made ? 'Great shot!' : 'Keep practicing!'} ${feedback}`,
      notification_data: { 
        shotId,
        analysis: analysisData,
        feedback 
      }
    });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: analysisData,
        feedback,
        message: 'Video analysis completed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in video analysis:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Video analysis failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateCoachingFeedback(analysis: VideoAnalysisData): string {
  const feedback: string[] = [];

  // Arc feedback
  if (analysis.arc_degrees < 40) {
    feedback.push("Shot arc is too flat - aim for 45-50 degrees");
  } else if (analysis.arc_degrees > 55) {
    feedback.push("Shot arc is too high - bring it down slightly");
  } else {
    feedback.push("Great shot arc!");
  }

  // Depth feedback
  if (Math.abs(analysis.depth_inches) > 3) {
    if (analysis.depth_inches > 0) {
      feedback.push("Shot is coming up long - adjust power");
    } else {
      feedback.push("Shot is coming up short - add more power");
    }
  } else {
    feedback.push("Perfect depth!");
  }

  // Left/Right feedback
  if (Math.abs(analysis.lr_deviation_inches) > 2) {
    if (analysis.lr_deviation_inches > 0) {
      feedback.push("Shot is drifting right - check your alignment");
    } else {
      feedback.push("Shot is drifting left - check your alignment");
    }
  } else {
    feedback.push("Good directional control!");
  }

  // Form feedback
  if (analysis.form_analysis.follow_through === 'incomplete') {
    feedback.push("Work on your follow-through");
  }

  if (analysis.form_analysis.elbow_alignment === 'needs improvement') {
    feedback.push("Keep your elbow under the ball");
  }

  return feedback.join('. ') + '.';
}