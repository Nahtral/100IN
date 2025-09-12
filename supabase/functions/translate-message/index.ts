import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const { messageId, content, targetLanguage } = await req.json();

    if (!content || !targetLanguage) {
      throw new Error('Missing required fields: content and targetLanguage');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For now, we'll implement a simple mock translation
    // In production, this would integrate with Google Translate API or similar
    const googleApiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    
    let translatedText = '';
    let confidence = 95;

    if (googleApiKey) {
      // Real Google Translate integration
      const translateResponse = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: content,
          target: targetLanguage,
          format: 'text'
        })
      });

      if (!translateResponse.ok) {
        throw new Error('Translation service failed');
      }

      const translateData = await translateResponse.json();
      translatedText = translateData.data.translations[0].translatedText;
      confidence = Math.round((translateData.data.translations[0].confidence || 0.95) * 100);
    } else {
      // Fallback to simple processing for development
      translatedText = `[Translated to ${targetLanguage}] ${content}`;
      confidence = 85;
    }

    // Log the translation request
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'message_translation',
        event_data: {
          message_id: messageId,
          source_language: 'auto-detect',
          target_language: targetLanguage,
          confidence_score: confidence,
          character_count: content.length
        }
      });

    return new Response(JSON.stringify({
      translatedText,
      confidence,
      sourceLanguage: 'auto-detect',
      targetLanguage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in translate-message function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      translatedText: `[Translation Error] ${error.message}`,
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});