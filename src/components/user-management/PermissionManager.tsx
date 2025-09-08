import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, User, Clock, AlertCircle } from 'lucide-react';
import { 
  getAllPermissions, 
  getUserEffectivePermissions, 
  grantUserPermission, 
  revokeUserPermission,
  PERMISSIONS 
} from '@/utils/permissions';
import { useToast } from '@/hooks/use-toast';

interface PermissionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UserPermissionState {
  hasPermission: boolean;
  source: 'role' | 'direct' | 'none';
  grantedAt?: string;
  reason?: string;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userRole
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, UserPermissionState>>({});
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen, userId]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      // Load all permissions
      const allPermissions = await getAllPermissions();
      setPermissions(allPermissions);

      // Load user's effective permissions
      const userEffectivePermissions = await getUserEffectivePermissions(userId);
      
      // Create permission state map
      const permissionState: Record<string, UserPermissionState> = {};
      
      // Initialize all permissions as not granted
      allPermissions.forEach(permission => {
        permissionState[permission.name] = {
          hasPermission: false,
          source: 'none'
        };
      });

      // Mark permissions from roles
      if (userEffectivePermissions && 'roles' in userEffectivePermissions && userEffectivePermissions.roles) {
        userEffectivePermissions.roles.forEach(role => {
          // Get default permissions for this role
          const rolePermissions = getRoleDefaultPermissions(role.role);
          rolePermissions.forEach(permName => {
            if (permissionState[permName]) {
              permissionState[permName] = {
                hasPermission: true,
                source: 'role'
              };
            }
          });
        });
      }

      // Override with direct user permissions
      if (userEffectivePermissions && 'userPermissions' in userEffectivePermissions && userEffectivePermissions.userPermissions) {
        userEffectivePermissions.userPermissions.forEach(up => {
          const permissionName = up.permissions?.name;
          if (permissionName && permissionState[permissionName]) {
            permissionState[permissionName] = {
              hasPermission: true,
              source: 'direct',
              grantedAt: up.granted_at,
              reason: up.reason
            };
          }
        });
      }

      setUserPermissions(permissionState);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDefaultPermissions = (role: string): string[] => {
    switch (role) {
      case 'staff':
        return [PERMISSIONS.MANAGE_ATTENDANCE];
      case 'coach':
        return [PERMISSIONS.MANAGE_ATTENDANCE, PERMISSIONS.VIEW_REPORTS];
      case 'medical':
        return [PERMISSIONS.MANAGE_MEDICAL, PERMISSIONS.VIEW_REPORTS];
      case 'super_admin':
        return Object.values(PERMISSIONS);
      default:
        return [];
    }
  };

  const handlePermissionToggle = async (permissionName: string, grant: boolean) => {
    if (!reason.trim() && grant) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for granting this permission",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = grant 
        ? await grantUserPermission(userId, permissionName, reason.trim())
        : await revokeUserPermission(userId, permissionName, reason.trim() || 'Revoked by Super Admin');

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "default"
        });
        setReason(''); // Clear reason after successful action
        await loadPermissions(); // Reload to reflect changes
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Manager - {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <User className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">{userName}</h3>
              <Badge variant="outline">{userRole}</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Staff default: Manage Attendance only. Grant others as needed.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Permission Change</Label>
            <Textarea
              id="reason"
              placeholder="Provide a reason for granting or revoking permissions..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <Separator />

          {/* Permissions by Category */}
          {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold text-lg capitalize flex items-center gap-2">
                {category.replace('_', ' ')}
                <Badge variant="secondary">{categoryPermissions.length}</Badge>
              </h3>
              
              <div className="grid gap-3">
                {categoryPermissions.map((permission) => {
                  const userPermState = userPermissions[permission.name];
                  const canToggle = userPermState?.source !== 'role' || !userPermState.hasPermission;
                  
                  return (
                     <div
                       key={`${permission.id}-${permission.name}`}
                       className="flex items-center justify-between p-3 border rounded-lg"
                     >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{permission.name}</h4>
                          {userPermState?.source === 'role' && (
                            <Badge variant="outline" className="text-xs">
                              From Role
                            </Badge>
                          )}
                          {userPermState?.source === 'direct' && (
                            <Badge variant="default" className="text-xs">
                              Direct Grant
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                        {userPermState?.grantedAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            Granted: {new Date(userPermState.grantedAt).toLocaleDateString()}
                            {userPermState.reason && ` - ${userPermState.reason}`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {userPermState?.source === 'role' && userPermState.hasPermission && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Role Default
                          </div>
                        )}
                        <Switch
                          checked={userPermState?.hasPermission || false}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(permission.name, checked)
                          }
                          disabled={loading || !canToggle}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionManager;