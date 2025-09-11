import { supabase } from '@/integrations/supabase/client';

// Centralized permission checking utility using existing functions
export const hasPermission = async (userId: string, permission: string): Promise<boolean> => {
  try {
    // Use the existing user_has_permission function
    const { data, error } = await supabase
      .rpc('user_has_permission', {
        _user_id: userId,
        _permission_name: permission
      });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Permission check exception:', error);
    return false;
  }
};

// Get user's effective permissions by checking existing tables
export const getUserEffectivePermissions = async (userId: string) => {
  try {
    // Get permissions from roles
    const { data: rolePermissions, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        role,
        is_active
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (roleError) {
      console.error('Get role permissions error:', roleError);
      return [];
    }

    // Get direct user permissions
    const { data: userPermissions, error: userError } = await supabase
      .from('user_permissions')
      .select(`
        permissions (name, description),
        is_active,
        granted_at,
        reason
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (userError) {
      console.error('Get user permissions error:', userError);
      return [];
    }

    return {
      roles: rolePermissions || [],
      userPermissions: userPermissions || []
    };
  } catch (error) {
    console.error('Get permissions exception:', error);
    return { roles: [], userPermissions: [] };
  }
};

// Grant permission to user (Super Admin only)
export const grantUserPermission = async (
  targetUserId: string, 
  permission: string, 
  reason?: string
) => {
  try {
    // Get permission ID first
    const { data: permissionData, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .eq('name', permission)
      .single();

    if (permError || !permissionData) {
      return { success: false, error: 'Permission not found' };
    }

    // Insert or update user permission
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: targetUserId,
        permission_id: permissionData.id,
        granted_by: (await supabase.auth.getUser()).data.user?.id,
        granted_at: new Date().toISOString(),
        is_active: true,
        reason: reason || 'Granted by Super Admin'
      });

    if (error) {
      console.error('Grant permission error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Permission granted successfully' };
  } catch (error) {
    console.error('Grant permission exception:', error);
    return { success: false, error: 'Failed to grant permission' };
  }
};

// Revoke permission from user (Super Admin only)
export const revokeUserPermission = async (
  targetUserId: string, 
  permission: string, 
  reason?: string
) => {
  try {
    // Get permission ID first
    const { data: permissionData, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .eq('name', permission)
      .single();

    if (permError || !permissionData) {
      return { success: false, error: 'Permission not found' };
    }

    // Update user permission to inactive
    const { error } = await supabase
      .from('user_permissions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        reason: (reason || 'Revoked by Super Admin')
      })
      .eq('user_id', targetUserId)
      .eq('permission_id', permissionData.id);

    if (error) {
      console.error('Revoke permission error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Permission revoked successfully' };
  } catch (error) {
    console.error('Revoke permission exception:', error);
    return { success: false, error: 'Failed to revoke permission' };
  }
};

// Get all available permissions
export const getAllPermissions = async () => {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Get all permissions error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get all permissions exception:', error);
    return [];
  }
};

// Permission constants for easier maintenance
export const PERMISSIONS = {
  MANAGE_ATTENDANCE: 'manage_attendance',
  MANAGE_STATS: 'manage_stats',
  MANAGE_TRAINING: 'manage_training',
  MANAGE_TEAMS: 'manage_teams',
  MANAGE_USERS: 'manage_users',
  VIEW_REPORTS: 'view_reports',
  MANAGE_PLAYERS: 'manage_players',
  MANAGE_SCHEDULES: 'manage_schedules',
  MANAGE_MEDICAL: 'manage_medical',
  MANAGE_PARTNERSHIPS: 'manage_partnerships',
  MANAGE_REGISTRATIONS: 'manage_registrations',
  VIEW_COMMUNICATIONS: 'view_communications'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];