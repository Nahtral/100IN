import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    const { imageBase64, gameDate, opponent, gameResult } = await req.json();
    
    console.log('Starting game stats analysis for:', { gameDate, opponent, gameResult });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all players for matching
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number')
      .eq('is_active', true);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw new Error('Failed to fetch players data');
    }

    // Prepare player context for AI
    const playerContext = players.map(p => 
      `${p.first_name} ${p.last_name} (#${p.jersey_number || 'N/A'})`
    ).join('\n');

    // Analyze image with OpenAI Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a basketball statistics analyzer. Extract game statistics from the provided image and match them to players.

Available players:
${playerContext}

Return ONLY a valid JSON object with this exact structure:
{
  "confidence": 0.95,
  "playerStats": [
    {
      "playerName": "First Last",
      "jerseyNumber": "5",
      "points": 15,
      "rebounds": 8,
      "assists": 3,
      "steals": 2,
      "blocks": 1,
      "turnovers": 2,
      "fieldGoalsMade": 6,
      "fieldGoalsAttempted": 10,
      "threePointsMade": 2,
      "threePointsAttempted": 4,
      "freeThrowsMade": 1,
      "freeThrowsAttempted": 2,
      "minutesPlayed": 32,
      "plusMinus": 8
    }
  ]
}

Rules:
- Only include players you can clearly identify from the image
- Match players by name and/or jersey number from the available list
- Use 0 for any stats not visible in the image
- Ensure all numeric values are integers
- Set confidence between 0.0 and 1.0 based on image clarity`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract basketball game statistics from this image. The game was on ${gameDate} against ${opponent} with result ${gameResult}.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', aiResponse);

    let analysisResult;
    try {
      const content = aiResponse.choices[0].message.content;
      console.log('Raw AI content:', content);
      
      // Clean up the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      analysisResult = JSON.parse(jsonMatch[0]);
      console.log('Parsed analysis result:', analysisResult);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Create AI job record
    const { data: aiJob, error: jobError } = await supabase
      .from('game_log_ai_jobs')
      .insert({
        screenshot_url: 'data:image/jpeg;base64,' + imageBase64.substring(0, 100) + '...',
        status: 'completed',
        ai_response: analysisResult,
        confidence_score: analysisResult.confidence,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating AI job:', jobError);
    }

    // Process each player's stats
    const gameLogEntries = [];
    const unmatchedPlayers = [];

    for (const playerStat of analysisResult.playerStats) {
      // Find matching player
      const matchedPlayer = players.find(p => {
        const nameMatch = `${p.first_name} ${p.last_name}`.toLowerCase() === playerStat.playerName.toLowerCase();
        const jerseyMatch = p.jersey_number && playerStat.jerseyNumber && 
                           p.jersey_number.toString() === playerStat.jerseyNumber.toString();
        return nameMatch || jerseyMatch;
      });

      if (matchedPlayer) {
        const gameLogEntry = {
          player_id: matchedPlayer.id,
          game_date: gameDate,
          opponent: opponent,
          result: gameResult,
          points: playerStat.points || 0,
          rebounds: playerStat.rebounds || 0,
          assists: playerStat.assists || 0,
          steals: playerStat.steals || 0,
          blocks: playerStat.blocks || 0,
          turnovers: playerStat.turnovers || 0,
          field_goals_made: playerStat.fieldGoalsMade || 0,
          field_goals_attempted: playerStat.fieldGoalsAttempted || 0,
          three_points_made: playerStat.threePointsMade || 0,
          three_points_attempted: playerStat.threePointsAttempted || 0,
          free_throws_made: playerStat.freeThrowsMade || 0,
          free_throws_attempted: playerStat.freeThrowsAttempted || 0,
          minutes_played: playerStat.minutesPlayed || 0,
          plus_minus: playerStat.plusMinus || 0,
          game_rating: parseFloat(((playerStat.points + playerStat.rebounds + playerStat.assists + playerStat.steals + playerStat.blocks - playerStat.turnovers) / 5).toFixed(1)),
          upload_method: 'screenshot',
          ai_processed: true,
          ai_confidence: analysisResult.confidence,
          raw_ai_data: playerStat,
          created_by: aiJob?.id || null,
          performance_notes: `Extracted from screenshot analysis (${Math.round(analysisResult.confidence * 100)}% confidence)`
        };

        gameLogEntries.push(gameLogEntry);
      } else {
        unmatchedPlayers.push(playerStat);
      }
    }

    console.log(`Matched ${gameLogEntries.length} players, ${unmatchedPlayers.length} unmatched`);

    return new Response(
      JSON.stringify({
        success: true,
        confidence: analysisResult.confidence,
        extractedStats: gameLogEntries,
        unmatchedPlayers: unmatchedPlayers,
        jobId: aiJob?.id,
        message: `Successfully extracted stats for ${gameLogEntries.length} player(s)`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-game-stats function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});