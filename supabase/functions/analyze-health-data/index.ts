import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { prompt, playerName } = await req.json();

    // For demonstration purposes, we'll return a mock analysis
    // In production, you would integrate with Perplexity API here
    const mockAnalysis = {
      overallTrend: "Positive trend with areas for improvement",
      healthScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
      riskFactors: [
        "Sleep quality showing some inconsistency patterns",
        "Hydration levels occasionally below optimal range",
        "Stress levels elevated during competition periods",
        "Training load may be impacting recovery metrics"
      ],
      recommendations: [
        "Establish consistent sleep schedule with 8+ hours nightly",
        "Implement pre-training hydration protocol",
        "Consider stress management techniques during high-pressure periods",
        "Monitor heart rate variability for recovery optimization",
        "Incorporate active recovery sessions between intense training"
      ],
      actionItems: [
        "Track sleep patterns for 2 weeks to identify optimal bedtime",
        "Set hydration reminders every 2 hours during training days",
        "Schedule weekly recovery assessment with medical team",
        "Implement mindfulness practices 10 minutes daily",
        "Review training periodization with coaching staff"
      ]
    };

    console.log(`Generated AI health analysis for player: ${playerName}`);
    console.log('Analysis data:', mockAnalysis);

    return new Response(JSON.stringify({ 
      analysis: mockAnalysis,
      status: 'success',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-health-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: 'error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});