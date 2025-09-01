import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParentCommunicationRequest {
  communications: any[];
  subject: string;
  message: string;
  communicationType: string;
  priority: string;
  playerIds: string[];
  includeHealthSummary: boolean;
  includeRecommendations: boolean;
  requestResponse: boolean;
  confidential: boolean;
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
      communications,
      subject,
      message,
      communicationType,
      priority,
      playerIds,
      includeHealthSummary,
      includeRecommendations,
      requestResponse,
      confidential
    }: ParentCommunicationRequest = await req.json();

    console.log('Processing parent communication:', { communicationType, playerIds: playerIds.length });

    // Get player information with parent relationships and health data
    const { data: playersData } = await supabase
      .from('players')
      .select(`
        id,
        user_id,
        profiles!inner(full_name, email),
        teams(name),
        health_wellness(fitness_score, injury_status, date, medical_notes),
        parent_child_relationships!inner(
          parent:profiles!parent_child_relationships_parent_id_fkey(id, full_name, email)
        )
      `)
      .in('id', playerIds)
      .eq('is_active', true);

    if (!playersData || playersData.length === 0) {
      throw new Error('No players found with parent relationships');
    }

    console.log(`Found ${playersData.length} players with parent relationships`);

    // Send individualized emails to each parent
    const emailPromises = playersData.map(async (player) => {
      const parent = player.parent_child_relationships[0]?.parent;
      if (!parent?.email) return null;

      // Generate personalized health summary if requested
      let healthSummaryHtml = '';
      if (includeHealthSummary) {
        const latestHealth = player.health_wellness?.[0];
        healthSummaryHtml = generateHealthSummaryHtml(player, latestHealth);
      }

      // Generate recommendations if requested
      let recommendationsHtml = '';
      if (includeRecommendations) {
        recommendationsHtml = generateRecommendationsHtml(player, communicationType);
      }

      const communicationIcon = getCommunicationIcon(communicationType);
      const priorityColor = getPriorityColor(priority);

      try {
        const emailResponse = await resend.emails.send({
          from: "Panthers Health Team <health@100in.app>",
          to: [parent.email],
          subject: `${communicationIcon} ${subject} - ${player.profiles.full_name}`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              ${confidential ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 6px; margin-bottom: 20px;">
                  <p style="color: #dc2626; margin: 0; font-weight: 600; text-align: center;">
                    🔒 CONFIDENTIAL COMMUNICATION
                  </p>
                </div>
              ` : ''}
              
              <div style="background: linear-gradient(135deg, #${priorityColor}, #10b981); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">
                  ${communicationIcon} Health Communication
                </h1>
                <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">
                  Regarding: ${player.profiles.full_name}
                </p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="margin-bottom: 20px;">
                  <span style="background: #f3f4f6; padding: 4px 12px; border-radius: 20px; font-size: 12px; color: #374151; font-weight: 500;">
                    ${getCommunicationTypeLabel(communicationType)}
                  </span>
                </div>
                
                <h2 style="color: #333; margin-top: 0;">${subject}</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <p style="color: #333; line-height: 1.6; margin: 0;">${message}</p>
                </div>
                
                ${healthSummaryHtml}
                ${recommendationsHtml}
                
                ${requestResponse ? `
                  <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Response Requested</h3>
                    <p style="color: #92400e; margin: 0;">
                      Please reply to this email with any questions or concerns you may have.
                    </p>
                  </div>
                ` : ''}
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 14px; margin: 0;">
                    This communication is from the health and medical team regarding your child's 
                    health and wellness. Please keep this information confidential.
                  </p>
                  <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                    Sent at: ${new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        console.log(`Email sent to parent of ${player.profiles.full_name}:`, emailResponse);
        return emailResponse;
      } catch (emailError) {
        console.error(`Failed to send email to parent of ${player.profiles.full_name}:`, emailError);
        return null;
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter(result => result !== null).length;

    // Update all communications with sent status
    const communicationIds = communications.map(c => c.id);
    await supabase
      .from('medical_communications')
      .update({ 
        is_read_by: {},
        updated_at: new Date().toISOString()
      })
      .in('id', communicationIds);

    // Log the communication in analytics
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'parent_communication_sent',
        event_data: {
          communication_type: communicationType,
          priority: priority,
          recipient_count: successCount,
          include_health_summary: includeHealthSummary,
          include_recommendations: includeRecommendations,
          request_response: requestResponse,
          confidential: confidential
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Parent communications sent successfully',
        sent: successCount,
        attempted: playersData.length
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
    console.error('Error in send-parent-communication function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send parent communication'
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

function generateHealthSummaryHtml(player: any, healthData: any): string {
  if (!healthData) {
    return `
      <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">Health Summary</h3>
        <p style="color: #6b7280; margin: 0;">No recent health data available for ${player.profiles.full_name}.</p>
      </div>
    `;
  }

  const statusColor = healthData.injury_status === 'injured' ? '#dc2626' : 
                     healthData.fitness_score >= 80 ? '#059669' : 
                     healthData.fitness_score >= 60 ? '#3b82f6' : '#f59e0b';

  const statusText = healthData.injury_status === 'injured' ? '🔴 Currently Injured' :
                    healthData.fitness_score >= 80 ? '🟢 Excellent Health' :
                    healthData.fitness_score >= 60 ? '🟡 Good Health' : '🟠 Needs Attention';

  return `
    <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Health Summary - ${player.profiles.full_name}</h3>
      
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;">
        <div style="background: white; padding: 10px; border-radius: 4px; flex: 1; min-width: 150px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Current Status</p>
          <p style="margin: 5px 0 0 0; font-weight: 600; color: ${statusColor};">${statusText}</p>
        </div>
        
        ${healthData.fitness_score ? `
          <div style="background: white; padding: 10px; border-radius: 4px; flex: 1; min-width: 150px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Fitness Score</p>
            <p style="margin: 5px 0 0 0; font-weight: 600; color: #374151;">${healthData.fitness_score}/100</p>
          </div>
        ` : ''}
        
        <div style="background: white; padding: 10px; border-radius: 4px; flex: 1; min-width: 150px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Last Assessment</p>
          <p style="margin: 5px 0 0 0; font-weight: 600; color: #374151;">${new Date(healthData.date).toLocaleDateString()}</p>
        </div>
      </div>
      
      ${healthData.medical_notes ? `
        <div style="background: white; padding: 15px; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280; margin-bottom: 5px;">Medical Notes</p>
          <p style="margin: 0; color: #374151; font-size: 14px;">${healthData.medical_notes}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function generateRecommendationsHtml(player: any, communicationType: string): string {
  const recommendations = getRecommendations(communicationType);
  
  return `
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px;">Health Recommendations</h3>
      <ul style="margin: 0; padding-left: 20px; color: #047857;">
        ${recommendations.map(rec => `<li style="margin-bottom: 8px;">${rec}</li>`).join('')}
      </ul>
    </div>
  `;
}

function getRecommendations(communicationType: string): string[] {
  switch (communicationType) {
    case 'injury_report':
      return [
        'Follow the prescribed rest and recovery protocol',
        'Attend all scheduled medical appointments',
        'Monitor for any changes in symptoms',
        'Maintain proper nutrition for healing'
      ];
    case 'fitness_progress':
      return [
        'Continue current training regimen',
        'Ensure adequate sleep (8-9 hours per night)',
        'Maintain proper hydration throughout the day',
        'Consider additional conditioning work if recommended'
      ];
    case 'medical_clearance':
      return [
        'Gradually return to full activity as approved',
        'Continue monitoring for any recurring symptoms',
        'Maintain communication with medical staff',
        'Follow all clearance conditions'
      ];
    default:
      return [
        'Maintain regular health check-ins',
        'Ensure proper nutrition and hydration',
        'Get adequate rest and recovery',
        'Communicate any health concerns promptly'
      ];
  }
}

function getCommunicationIcon(type: string): string {
  switch (type) {
    case 'injury_report': return '🏥';
    case 'fitness_progress': return '💪';
    case 'medical_clearance': return '✅';
    case 'health_advisory': return '⚠️';
    default: return '❤️';
  }
}

function getCommunicationTypeLabel(type: string): string {
  switch (type) {
    case 'health_update': return 'Health Status Update';
    case 'injury_report': return 'Injury Report';
    case 'fitness_progress': return 'Fitness Progress';
    case 'medical_clearance': return 'Medical Clearance';
    case 'health_advisory': return 'Health Advisory';
    default: return 'Health Communication';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'dc2626';
    case 'medium': return 'f59e0b';
    default: return '10b981';
  }
}

serve(handler);