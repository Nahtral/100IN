import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthAlertRequest {
  communicationId: string;
  subject: string;
  message: string;
  alertType: string;
  priority: string;
  recipients: string[];
  sendEmail: boolean;
  sendSMS: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const {
      communicationId,
      subject,
      message,
      alertType,
      priority,
      recipients,
      sendEmail,
      sendSMS
    }: HealthAlertRequest = await req.json();

    console.log('Processing health alert:', { communicationId, alertType, priority, recipients });

    const emailAddresses: string[] = [];
    const recipientIds: string[] = [];

    // Collect email addresses based on recipient types
    for (const recipientType of recipients) {
      if (recipientType === 'player') {
        const { data: players } = await supabase
          .from('players')
          .select('user_id, profiles!inner(email)')
          .eq('is_active', true);

        if (players) {
          players.forEach(player => {
            emailAddresses.push(player.profiles.email);
            recipientIds.push(player.user_id);
          });
        }
      }

      if (recipientType === 'parent') {
        const { data: parents } = await supabase
          .from('parent_child_relationships')
          .select('parent:profiles!parent_child_relationships_parent_id_fkey(id, email)');

        if (parents) {
          parents.forEach(relationship => {
            if (relationship.parent?.email) {
              emailAddresses.push(relationship.parent.email);
              recipientIds.push(relationship.parent.id);
            }
          });
        }
      }

      if (recipientType === 'staff') {
        const { data: staff } = await supabase
          .from('user_roles')
          .select('user_id, profiles!inner(email)')
          .in('role', ['staff', 'coach', 'medical'])
          .eq('is_active', true);

        if (staff) {
          staff.forEach(member => {
            emailAddresses.push(member.profiles.email);
            recipientIds.push(member.user_id);
          });
        }
      }
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(emailAddresses)];
    const uniqueRecipientIds = [...new Set(recipientIds)];

    console.log(`Sending to ${uniqueEmails.length} unique recipients`);

    // Update communication with recipient IDs
    await supabase
      .from('medical_communications')
      .update({ recipient_ids: uniqueRecipientIds })
      .eq('id', communicationId);

    // Send emails if requested
    if (sendEmail && uniqueEmails.length > 0) {
      const alertIcon = getAlertIcon(alertType);
      const priorityColor = getPriorityColor(priority);
      
      try {
        const emailResponse = await resend.emails.send({
          from: "Health Alert <alerts@resend.dev>",
          to: uniqueEmails,
          subject: `🚨 ${subject}`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              <div style="background: linear-gradient(135deg, #${priorityColor}, #ff6b6b); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">
                  ${alertIcon} HEALTH ALERT
                </h1>
                <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">
                  Priority: ${priority.toUpperCase()}
                </p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">${subject}</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <p style="color: #333; line-height: 1.6; margin: 0;">${message}</p>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 14px; margin: 0;">
                    This is an automated health alert from the team medical staff. 
                    Please take appropriate action as needed.
                  </p>
                  <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                    Sent at: ${new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        console.log('Email sent successfully:', emailResponse);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    // Log the alert in analytics
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'health_alert_sent',
        event_data: {
          communication_id: communicationId,
          alert_type: alertType,
          priority: priority,
          recipient_count: uniqueEmails.length,
          channels: {
            email: sendEmail,
            sms: sendSMS
          }
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Health alert sent successfully',
        recipients: uniqueEmails.length
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-health-alert function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send health alert'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
};

function getAlertIcon(alertType: string): string {
  switch (alertType) {
    case 'emergency': return '🚨';
    case 'injury': return '🏥';
    case 'health_advisory': return '⚠️';
    case 'protocol_update': return '📋';
    default: return '🔔';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'dc2626';
    case 'medium': return 'f59e0b';
    default: return '3b82f6';
  }
}

serve(handler);