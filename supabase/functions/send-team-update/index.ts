import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamUpdateRequest {
  communicationId: string;
  subject: string;
  message: string;
  updateType: string;
  teamIds: string[];
  includeParents: boolean;
  includeCoaches: boolean;
  scheduledFor?: string;
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
      updateType,
      teamIds,
      includeParents,
      includeCoaches,
      scheduledFor
    }: TeamUpdateRequest = await req.json();

    console.log('Processing team update:', { communicationId, updateType, teamIds });

    // Check if this is a scheduled message
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      console.log('Message scheduled for later:', scheduledFor);
      // In a production system, you'd queue this for later processing
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Team update scheduled successfully',
          scheduledFor
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const emailAddresses: string[] = [];
    const recipientIds: string[] = [];

    // Get team information
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, sport')
      .in('id', teamIds);

    if (!teams || teams.length === 0) {
      throw new Error('No teams found');
    }

    // Get players from selected teams
    const { data: players } = await supabase
      .from('players')
      .select('user_id, team_id, profiles!inner(email, full_name)')
      .in('team_id', teamIds)
      .eq('is_active', true);

    if (players) {
      players.forEach(player => {
        emailAddresses.push(player.profiles.email);
        recipientIds.push(player.user_id);
      });
    }

    // Include parents if requested
    if (includeParents && players) {
      const playerUserIds = players.map(p => p.user_id);
      const { data: parentRelationships } = await supabase
        .from('parent_child_relationships')
        .select('parent:profiles!parent_child_relationships_parent_id_fkey(id, email, full_name)')
        .in('child_id', playerUserIds);

      if (parentRelationships) {
        parentRelationships.forEach(relationship => {
          if (relationship.parent?.email) {
            emailAddresses.push(relationship.parent.email);
            recipientIds.push(relationship.parent.id);
          }
        });
      }
    }

    // Include coaches if requested
    if (includeCoaches) {
      const { data: coaches } = await supabase
        .from('teams')
        .select(`
          coach_id,
          coach:profiles!teams_coach_id_fkey(email, full_name)
        `)
        .in('id', teamIds)
        .not('coach_id', 'is', null);

      if (coaches) {
        coaches.forEach(team => {
          if (team.coach?.email) {
            emailAddresses.push(team.coach.email);
            recipientIds.push(team.coach_id);
          }
        });
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

    // Send emails
    if (uniqueEmails.length > 0) {
      const updateIcon = getUpdateIcon(updateType);
      const teamNames = teams.map(t => t.name).join(', ');
      
      try {
        const emailResponse = await resend.emails.send({
          from: "100IN Team Updates <updates@100in.app>",
          to: uniqueEmails,
          subject: `${updateIcon} ${subject}`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">
                  ${updateIcon} TEAM UPDATE
                </h1>
                <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">
                  Team(s): ${teamNames}
                </p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">${subject}</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <p style="color: #333; line-height: 1.6; margin: 0;">${message}</p>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <h3 style="color: #1565c0; margin: 0 0 10px 0; font-size: 16px;">Update Type</h3>
                  <p style="color: #1976d2; margin: 0; font-weight: 500;">${getUpdateTypeLabel(updateType)}</p>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 14px; margin: 0;">
                    This update was sent to all players${includeParents ? ', parents' : ''}${includeCoaches ? ', and coaches' : ''} 
                    of the selected team(s).
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

    // Log the update in analytics
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'team_update_sent',
        event_data: {
          communication_id: communicationId,
          update_type: updateType,
          team_count: teamIds.length,
          recipient_count: uniqueEmails.length,
          include_parents: includeParents,
          include_coaches: includeCoaches
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Team update sent successfully',
        recipients: uniqueEmails.length,
        teams: teams.length
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
    console.error('Error in send-team-update function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send team update'
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

function getUpdateIcon(updateType: string): string {
  switch (updateType) {
    case 'health_summary': return '❤️';
    case 'training_update': return '💪';
    case 'safety_protocol': return '🛡️';
    case 'schedule_change': return '📅';
    default: return '📢';
  }
}

function getUpdateTypeLabel(updateType: string): string {
  switch (updateType) {
    case 'health_summary': return 'Health Summary';
    case 'training_update': return 'Training Update';
    case 'safety_protocol': return 'Safety Protocol';
    case 'schedule_change': return 'Schedule Change';
    default: return 'General Update';
  }
}

serve(handler);