import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string | string[];
  subject: string;
  message: string;
  type: 'welcome' | 'notification' | 'alert' | 'reminder' | 'medical_alert' | 'appointment_reminder' | 'schedule_update';
  userId?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  data?: {
    playerName?: string;
    appointmentDate?: string;
    eventTitle?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message, type, userId, urgency, data }: NotificationRequest = await req.json();

    console.log(`Sending ${type} email to ${Array.isArray(to) ? to.join(', ') : to} for user ${userId || 'unknown'}`);

    // Enhanced template based on type
    const getEmailHTML = () => {
      const baseStyle = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #FF2A2A, #002d72); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="color: #B38F54; font-weight: bold; font-size: 24px; margin: 0; text-shadow: 1px 1px 0px #B38F54;">🏀 100IN</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Basketball Management System</p>
            </div>
      `;

      const footer = `
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0;">100IN Management System</p>
              <p style="margin: 5px 0 0 0;">This email was sent automatically. Please do not reply.</p>
            </div>
          </div>
        </div>
      `;

      switch (type) {
        case 'medical_alert':
          const alertColor = urgency === 'critical' ? '#dc3545' : urgency === 'high' ? '#fd7e14' : '#ffc107';
          const alertBg = urgency === 'critical' ? '#f8d7da' : urgency === 'high' ? '#fdf2e9' : '#fff9db';
          return `${baseStyle}
            <div style="padding: 30px 20px;">
              <h2 style="color: #dc3545; margin-bottom: 20px;">⚠️ Medical Alert</h2>
              <div style="border-left: 4px solid ${alertColor}; background: ${alertBg}; padding: 15px; margin: 15px 0; border-radius: 4px;">
                ${data?.playerName ? `<p><strong>Player:</strong> ${data.playerName}</p>` : ''}
                <p><strong>Alert:</strong> ${message}</p>
                <p><strong>Urgency:</strong> ${urgency?.toUpperCase() || 'MEDIUM'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p>Please review the medical dashboard immediately and take appropriate action.</p>
            </div>
            ${footer}`;

        case 'appointment_reminder':
          return `${baseStyle}
            <div style="padding: 30px 20px;">
              <h2 style="color: #002d72; margin-bottom: 20px;">📅 Appointment Reminder</h2>
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${data?.playerName ? `<p><strong>Patient:</strong> ${data.playerName}</p>` : ''}
                ${data?.appointmentDate ? `<p><strong>Date & Time:</strong> ${data.appointmentDate}</p>` : ''}
                <p><strong>Details:</strong> ${message}</p>
              </div>
              <p>Please arrive 15 minutes early for check-in.</p>
            </div>
            ${footer}`;

        case 'schedule_update':
          return `${baseStyle}
            <div style="padding: 30px 20px;">
              <h2 style="color: #002d72; margin-bottom: 20px;">📋 Schedule Update</h2>
              <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${data?.eventTitle ? `<p><strong>Event:</strong> ${data.eventTitle}</p>` : ''}
                <p><strong>Update:</strong> ${message}</p>
              </div>
              <p>Please check the schedule page for complete details.</p>
            </div>
            ${footer}`;

        default:
          return `${baseStyle}
            <div style="padding: 30px 20px;">
              <h2 style="color: #002d72; margin-bottom: 20px;">${subject}</h2>
              <div style="color: #333; line-height: 1.6; margin-bottom: 20px;">
                ${message}
              </div>
            </div>
            ${footer}`;
      }
    };

    const emailResponse = await resend.emails.send({
      from: "100IN <noreply@100in.app>",
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: getEmailHTML(),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
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