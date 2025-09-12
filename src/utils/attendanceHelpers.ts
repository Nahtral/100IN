import { supabase } from '@/integrations/supabase/client';

export interface AttendanceRecord {
  player_id: string;
  schedule_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string | null;
  marked_by: string;
  marked_at: string;
}

export interface PlayerWithAttendance {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  full_name: string;
  email: string;
  phone?: string;
  team_name: string;
  team_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  hasExistingRecord: boolean;
}

export interface MembershipSummary {
  membership_id: string;
  allocation_type: string;
  remaining_classes: number;
  status: string;
}

/**
 * Validates attendance record data before saving
 */
export const validateAttendanceRecord = (record: Partial<AttendanceRecord>): string[] => {
  const errors: string[] = [];
  
  if (!record.player_id) {
    errors.push('Player ID is required');
  }
  
  if (!record.schedule_id) {
    errors.push('Schedule ID is required');
  }
  
  if (!record.status || !['present', 'absent', 'late', 'excused'].includes(record.status)) {
    errors.push('Valid status is required');
  }
  
  if (!record.marked_by) {
    errors.push('Marked by user ID is required');
  }
  
  return errors;
};

/**
 * Formats attendance records for database insertion
 */
export const formatAttendanceRecords = (
  attendance: Record<string, { player_id: string; status: string; notes?: string }>,
  scheduleId: string,
  markedBy: string
): AttendanceRecord[] => {
  return Object.values(attendance).map(record => ({
    player_id: record.player_id,
    schedule_id: scheduleId,
    status: record.status as 'present' | 'absent' | 'late' | 'excused',
    notes: record.notes || null,
    marked_by: markedBy,
    marked_at: new Date().toISOString()
  }));
};

/**
 * Fetches players assigned to specific teams through player_teams junction table
 */
export const fetchPlayersForTeams = async (teamIds: string[]) => {
  if (!teamIds?.length) {
    throw new Error('Team IDs are required');
  }

  // Step 1: Get player-team relationships
  const { data: playerTeams, error: ptError } = await supabase
    .from('player_teams')
    .select('player_id, team_id')
    .in('team_id', teamIds)
    .eq('is_active', true);

  if (ptError) throw ptError;
  if (!playerTeams?.length) {
    return { players: [], playerTeamMap: new Map() };
  }

  const playerIds = [...new Set(playerTeams.map(pt => pt.player_id))];
  const playerTeamMap = new Map(playerTeams.map(pt => [pt.player_id, pt.team_id]));

  // Step 2: Get player details
  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select('id, user_id, jersey_number, position')
    .in('id', playerIds)
    .eq('is_active', true);

  if (playersError) throw playersError;
  if (!playersData?.length) {
    return { players: [], playerTeamMap };
  }

  const userIds = playersData.map(p => p.user_id);

  // Step 3: Get profiles
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, approval_status')
    .in('id', userIds)
    .eq('approval_status', 'approved');

  if (profilesError) throw profilesError;

  // Step 4: Get team names
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', teamIds)
    .eq('is_active', true);

  if (teamsError) throw teamsError;

  // Build lookup maps
  const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
  const teamsMap = new Map((teamsData || []).map(t => [t.id, t.name]));

  // Transform data
  const players = (playersData || [])
    .filter(player => profilesMap.has(player.user_id))
    .map(player => {
      const profile = profilesMap.get(player.user_id)!;
      const teamId = playerTeamMap.get(player.id) || '';

      return {
        id: player.id,
        user_id: player.user_id,
        jersey_number: player.jersey_number || undefined,
        position: player.position || undefined,
        full_name: profile.full_name || 'Unknown Player',
        email: profile.email || '',
        phone: profile.phone || undefined,
        team_name: teamsMap.get(teamId) || 'Unknown Team',
        team_id: teamId,
      };
    });

  return { players, playerTeamMap };
};

/**
 * Fetches existing attendance records for an event
 */
export const fetchExistingAttendance = async (scheduleId: string, playerIds: string[]) => {
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('player_attendance')
    .select('player_id, status, notes')
    .eq('schedule_id', scheduleId)
    .in('player_id', playerIds);

  if (attendanceError) {
    console.warn('Error fetching existing attendance:', attendanceError);
    return [];
  }

  return attendanceData || [];
};

/**
 * Saves attendance records to the database
 */
export const saveAttendanceRecords = async (records: AttendanceRecord[]) => {
  // Validate all records first
  const allErrors: string[] = [];
  records.forEach((record, index) => {
    const errors = validateAttendanceRecord(record);
    if (errors.length > 0) {
      allErrors.push(`Record ${index + 1}: ${errors.join(', ')}`);
    }
  });

  if (allErrors.length > 0) {
    throw new Error(`Validation errors: ${allErrors.join('; ')}`);
  }

  console.log('💾 Saving attendance records:', records);

  const { error: attendanceError } = await supabase
    .from('player_attendance')
    .upsert(records, {
      onConflict: 'player_id,schedule_id',
      ignoreDuplicates: false
    });

  if (attendanceError) {
    console.error('💥 Error saving attendance:', attendanceError);
    throw attendanceError;
  }

  console.log('✅ Attendance records saved successfully');
  return { success: true };
};

/**
 * Processes membership deductions for present players
 */
export const processMembershipDeductions = async (
  presentPlayerIds: string[],
  eventTitle: string,
  markedBy: string,
  playersMap: Map<string, any>
) => {
  const membershipResults = {
    successfulDeductions: 0,
    errors: [] as string[]
  };

  for (const playerId of presentPlayerIds) {
    try {
      // Get the player's active membership
      const { data: membershipData, error: membershipError } = await supabase
        .rpc('fn_get_membership_summary', { target_player_id: playerId });

      if (membershipError) {
        console.warn(`Failed to check membership for player ${playerId}:`, membershipError);
        continue;
      }

      const membership = membershipData as any;
      
      // Only deduct for CLASS_COUNT type memberships with remaining classes
      if (membership?.allocation_type === 'CLASS_COUNT' && 
          membership?.remaining_classes && 
          membership?.remaining_classes > 0 &&
          membership?.status === 'ACTIVE') {
        
        // Create a membership adjustment record
        const { error: adjustmentError } = await supabase
          .from('membership_adjustments')
          .insert({
            player_membership_id: membership.membership_id,
            delta: -1,
            reason: `Attendance deduction for event: ${eventTitle}`,
            created_by: markedBy
          });

        if (adjustmentError) {
          console.warn(`Failed to deduct membership for player ${playerId}:`, adjustmentError);
          const playerName = playersMap.get(playerId)?.full_name || 'Unknown Player';
          membershipResults.errors.push(`Failed to deduct class for ${playerName}`);
        } else {
          membershipResults.successfulDeductions++;
        }
      }
    } catch (error) {
      console.warn(`Error processing membership for player ${playerId}:`, error);
    }
  }

  return membershipResults;
};