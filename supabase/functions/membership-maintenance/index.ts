import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MembershipUsage {
  membership_id: string;
  player_id: string;
  player_name: string;
  membership_type_name: string;
  allocation_type: string;
  allocated_classes: number | null;
  used_classes: number;
  remaining_classes: number | null;
  days_left: number | null;
  should_deactivate: boolean;
}

interface AlertThreshold {
  code: string;
  title: string;
  message: string;
  condition: (usage: MembershipUsage) => boolean;
}

const alertThresholds: AlertThreshold[] = [
  {
    code: 'REMAINING_3',
    title: 'Only 3 Classes Remaining',
    message: 'You have 3 classes left in your membership. Consider renewing soon!',
    condition: (usage) => usage.allocation_type === 'CLASS_COUNT' && usage.remaining_classes === 3
  },
  {
    code: 'REMAINING_1',
    title: 'Only 1 Class Remaining',
    message: 'You have only 1 class left in your membership. Please renew to continue.',
    condition: (usage) => usage.allocation_type === 'CLASS_COUNT' && usage.remaining_classes === 1
  },
  {
    code: 'REMAINING_0',
    title: 'Membership Used Up',
    message: 'Your membership has been fully used. Please renew to continue attending classes.',
    condition: (usage) => usage.allocation_type === 'CLASS_COUNT' && usage.remaining_classes === 0
  },
  {
    code: 'DATE_7D',
    title: 'Membership Expires in 7 Days',
    message: 'Your membership will expire in 7 days. Please renew to continue.',
    condition: (usage) => usage.allocation_type === 'DATE_RANGE' && usage.days_left === 7
  },
  {
    code: 'DATE_3D',
    title: 'Membership Expires in 3 Days',
    message: 'Your membership will expire in 3 days. Please renew immediately.',
    condition: (usage) => usage.allocation_type === 'DATE_RANGE' && usage.days_left === 3
  },
  {
    code: 'DATE_1D',
    title: 'Membership Expires Tomorrow',
    message: 'Your membership expires tomorrow. Please renew now to avoid interruption.',
    condition: (usage) => usage.allocation_type === 'DATE_RANGE' && usage.days_left === 1
  },
  {
    code: 'DATE_0D',
    title: 'Membership Expired',
    message: 'Your membership has expired. Please renew to continue attending classes.',
    condition: (usage) => usage.allocation_type === 'DATE_RANGE' && usage.days_left === 0
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting membership maintenance...');

    // 1. Auto-deactivate players
    const { data: deactivationResult, error: deactivationError } = await supabaseClient
      .rpc('fn_auto_deactivate_players');

    if (deactivationError) {
      console.error('Error in auto-deactivation:', deactivationError);
    } else {
      console.log('Auto-deactivation result:', deactivationResult);
    }

    // 2. Get all membership usage data for alert processing
    const { data: usageData, error: usageError } = await supabaseClient
      .from('vw_player_membership_usage_secure')
      .select('*');

    if (usageError) {
      console.error('Error fetching usage data:', usageError);
      throw usageError;
    }

    console.log(`Processing ${usageData?.length || 0} active memberships for alerts`);

    let alertsSent = 0;
    const notifications = [];

    // 3. Process alerts for each membership
    for (const usage of usageData || []) {
      for (const threshold of alertThresholds) {
        if (threshold.condition(usage)) {
          // Check if alert already sent
          const { data: existingAlert } = await supabaseClient
            .from('membership_alerts_sent')
            .select('id')
            .eq('player_membership_id', usage.membership_id)
            .eq('alert_code', threshold.code)
            .single();

          if (!existingAlert) {
            // Create notification
            const { error: notificationError } = await supabaseClient
              .rpc('create_notification', {
                target_user_id: usage.player_id,
                notification_type: 'membership_alert',
                notification_title: threshold.title,
                notification_message: threshold.message.replace(
                  '{remaining}',
                  usage.remaining_classes?.toString() || '0'
                ).replace(
                  '{days}',
                  usage.days_left?.toString() || '0'
                ),
                notification_data: {
                  membership_id: usage.membership_id,
                  alert_code: threshold.code,
                  player_name: usage.player_name,
                  membership_type: usage.membership_type_name
                },
                notification_priority: threshold.code.includes('0') ? 'high' : 'normal',
                entity_type: 'membership',
                entity_id: usage.membership_id
              });

            if (!notificationError) {
              // Mark alert as sent
              await supabaseClient
                .from('membership_alerts_sent')
                .insert({
                  player_membership_id: usage.membership_id,
                  alert_code: threshold.code
                });

              alertsSent++;
              notifications.push({
                player_name: usage.player_name,
                alert_type: threshold.code,
                message: threshold.title
              });

              console.log(`Sent ${threshold.code} alert to ${usage.player_name}`);
            } else {
              console.error('Error creating notification:', notificationError);
            }
          }
        }
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      deactivated_players: deactivationResult?.deactivated_count || 0,
      alerts_sent: alertsSent,
      notifications_sent: notifications,
      memberships_processed: usageData?.length || 0
    };

    console.log('Membership maintenance completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in membership maintenance:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});