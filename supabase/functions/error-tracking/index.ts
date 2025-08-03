import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ErrorEvent {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  userRole?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

interface PerformanceEvent {
  metric: string;
  value: number;
  url: string;
  userId?: string;
  timestamp: string;
  context?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    console.log(`Tracking ${type} event:`, data);

    if (type === 'error') {
      const errorData: ErrorEvent = data;
      
      // Store error in database
      const { error } = await supabase
        .from('error_logs')
        .insert({
          message: errorData.message,
          stack: errorData.stack,
          url: errorData.url,
          user_agent: errorData.userAgent,
          user_id: errorData.userId,
          user_role: errorData.userRole,
          severity: errorData.severity,
          context: errorData.context,
          created_at: errorData.timestamp
        });

      if (error) {
        console.error('Failed to store error log:', error);
      }

      // Send critical errors via email notification
      if (errorData.severity === 'critical') {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              to: 'admin@panthersbasketball.com', // Replace with actual admin email
              subject: '🚨 Critical Error Alert - Panthers Basketball',
              message: `
                <h3>Critical Error Detected</h3>
                <p><strong>Message:</strong> ${errorData.message}</p>
                <p><strong>URL:</strong> ${errorData.url}</p>
                <p><strong>User:</strong> ${errorData.userId || 'Anonymous'} (${errorData.userRole || 'Unknown role'})</p>
                <p><strong>Time:</strong> ${errorData.timestamp}</p>
                ${errorData.stack ? `<p><strong>Stack:</strong><br><pre style="background:#f5f5f5;padding:10px;border-radius:4px;">${errorData.stack}</pre></p>` : ''}
              `,
              type: 'alert'
            }
          });
        } catch (emailError) {
          console.error('Failed to send critical error email:', emailError);
        }
      }
    }

    if (type === 'performance') {
      const perfData: PerformanceEvent = data;
      
      // Store performance metric
      const { error } = await supabase
        .from('performance_logs')
        .insert({
          metric: perfData.metric,
          value: perfData.value,
          url: perfData.url,
          user_id: perfData.userId,
          context: perfData.context,
          created_at: perfData.timestamp
        });

      if (error) {
        console.error('Failed to store performance log:', error);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in tracking function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);