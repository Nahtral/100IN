import { supabase } from '@/integrations/supabase/client';

interface AttendanceRecord {
  player_id: string;
  event_id: string;
  team_id: string;
  status: string;
  notes?: string;
  recorded_by: string;
  recorded_at?: Date;
}

interface PlayerWithAttendance {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  team_id?: string;
  team_name?: string;
  position?: string;
  jersey_number?: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  hasExistingRecord?: boolean;
}

interface MembershipSummary {
  id: string;
  allocated_classes: number;
  used_classes: number;
  remaining_classes: number;
  status: string;
  type: string;
  days_left?: number;
  should_deactivate: boolean;
  is_expired: boolean;
}

/**
 * Validates a single attendance record
 */
export const validateAttendanceRecord = (record: Partial<AttendanceRecord>): string[] => {
  const errors: string[] = [];
  
  if (!record.player_id) {
    errors.push('Player ID is required');
  }
  
  if (!record.event_id) {
    errors.push('Event ID is required');
  }
  
  if (!record.team_id) {
    errors.push('Team ID is required');
  }
  
  if (!record.status) {
    errors.push('Status is required');
  } else if (!['present', 'absent', 'late', 'excused'].includes(record.status)) {
    errors.push('Invalid status value');
  }
  
  if (!record.recorded_by) {
    errors.push('Recorded by user ID is required');
  }
  
  return errors;
};

/**
 * Formats attendance data for RPC call
 */
export const formatAttendanceRecords = (
  attendance: Record<string, { player_id: string; status: string; notes?: string }>,
  eventId: string,
  markedBy: string
): any[] => {
  const records: any[] = [];
  
  Object.entries(attendance).forEach(([playerId, data]) => {
    records.push({
      player_id: data.player_id,
      status: data.status,
      notes: data.notes || ''
    });
  });
  
  return records;
};

/**
 * Fetches players for given team IDs with their team information
 */
export const fetchPlayersForTeams = async (teamIds: string[]): Promise<{
  players: any[];
  playerTeamMap: Map<string, string>;
}> => {
  try {
    console.log('Fetching players for teams:', teamIds);
    
    if (!teamIds || teamIds.length === 0) {
      return { players: [], playerTeamMap: new Map() };
    }

    // First get team members from the new team_members table
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        team_id
      `)
      .in('team_id', teamIds)
      .eq('is_active', true);

    if (teamMembersError) {
      console.error('Error fetching team members:', teamMembersError);
      throw teamMembersError;
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log('No team members found for teams:', teamIds);
      return { players: [], playerTeamMap: new Map() };
    }

    // Get the user IDs to fetch profile data
    const userIds = teamMembers.map(tm => tm.user_id);
    
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Get team names
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
    }

    // Merge team membership with profile data
    const playerTeamMap = new Map<string, string>();
    const players = teamMembers.map(tm => {
      const profile = profiles?.find(p => p.id === tm.user_id);
      const team = teams?.find(t => t.id === tm.team_id);
      playerTeamMap.set(tm.user_id, tm.team_id);
      
      return {
        id: tm.user_id,
        user_id: tm.user_id,
        email: profile?.email || '',
        full_name: profile?.full_name || 'Unknown',
        phone: profile?.phone,
        team_id: tm.team_id,
        team_name: team?.name || 'Unknown Team',
        status: 'absent' as const, // Default status
        notes: '',
        hasExistingRecord: false,
        jersey_number: undefined
      };
    });

    console.log(`Found ${players.length} players across ${teamIds.length} teams`);
    return { players, playerTeamMap };
    
  } catch (error) {
    console.error('Error in fetchPlayersForTeams:', error);
    throw error;
  }
};

/**
 * Fetches existing attendance records for players and event
 */
export const fetchExistingAttendance = async (
  eventId: string,
  playerIds: string[]
): Promise<any[] | []> => {
  try {
    console.log('Fetching existing attendance for event:', eventId, 'players:', playerIds.length);
    
    if (!playerIds || playerIds.length === 0) {
      return [];
    }

    // Use the new attendance table
    const { data: existingAttendance, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('event_id', eventId)
      .in('player_id', playerIds);

    if (error) {
      console.error('Error fetching existing attendance:', error);
      throw error;
    }

    console.log(`Found ${existingAttendance?.length || 0} existing attendance records`);
    return existingAttendance || [];
    
  } catch (error) {
    console.error('Error in fetchExistingAttendance:', error);
    return [];
  }
};

/**
 * Saves attendance records using the new RPC function
 */
export const saveAttendanceRecords = async (
  eventId: string,
  teamId: string,
  attendance: Record<string, { player_id: string; status: string; notes?: string }>
): Promise<{ success: true; results: any[] }> => {
  console.log('Saving attendance using new RPC function');

  // Format entries for RPC call with proper structure
  const attendanceRecords = Object.values(attendance).map(record => ({
    event_id: eventId,
    team_id: teamId || null,
    player_id: record.player_id,
    status: record.status,
    notes: record.notes || null
  }));

  console.log('Calling rpc_save_attendance_batch with:', {
    p_records: attendanceRecords
  });

  // Call the new RPC function
  const { error } = await supabase.rpc('rpc_save_attendance_batch', {
    p_records: attendanceRecords
  });

  if (error) {
    console.error('Error saving attendance via RPC:', error);
    throw new Error(`Failed to save attendance: ${error.message}`);
  }

  console.log('Successfully saved attendance records');
  return { success: true, results: [] };
};

/**
 * Legacy function for compatibility - now uses RPC
 */
export const processMembershipDeductions = async (
  presentPlayerIds: string[],
  eventTitle: string,
  markedBy: string,
  playersMap: Map<string, any>
): Promise<{ successfulDeductions: number; errors: string[] }> => {
  // This is now handled automatically by the RPC function
  console.log('Membership deductions are now handled automatically by the RPC function');
  return { successfulDeductions: presentPlayerIds.length, errors: [] };
};

export type { PlayerWithAttendance, MembershipSummary, AttendanceRecord };