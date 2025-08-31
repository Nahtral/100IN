import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Plus, Edit, Trash2, Shield, Users } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UserPermission {
  user_id: string;
  user_name: string;
  user_email: string;
  permissions: Permission[];
  roles: string[];
}

export const PermissionsManagement = () => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [newPermission, setNewPermission] = useState({
    name: '',
    description: '',
    category: 'general'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPermissions(),
        fetchUserPermissions()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive",
      });
      return;
    }

    setPermissions(data || []);
  };

  const fetchUserPermissions = async () => {
    try {
      // Get all users with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) throw profilesError;

      // Get user roles for each user
      const userPermissionsData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .eq('is_active', true);

          return {
            user_id: profile.id,
            user_name: profile.full_name || 'Unknown',
            user_email: profile.email,
            permissions: [], // Simplified for now
            roles: roles?.map(r => r.role) || []
          };
        })
      );

      setUserPermissions(userPermissionsData);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  const createPermission = async () => {
    if (!newPermission.name || !newPermission.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('permissions')
        .insert([newPermission]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission created successfully",
      });

      setNewPermission({ name: '', description: '', category: 'general' });
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating permission:', error);
      toast({
        title: "Error",
        description: "Failed to create permission",
        variant: "destructive",
      });
    }
  };

  const updatePermission = async () => {
    if (!selectedPermission) return;

    try {
      const { error } = await supabase
        .from('permissions')
        .update({
          name: newPermission.name,
          description: newPermission.description,
          category: newPermission.category
        })
        .eq('id', selectedPermission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission updated successfully",
      });

      setEditDialogOpen(false);
      setSelectedPermission(null);
      fetchData();
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const deletePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission deleted successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast({
        title: "Error",
        description: "Failed to delete permission",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (permission?: Permission) => {
    if (permission) {
      setSelectedPermission(permission);
      setNewPermission({
        name: permission.name,
        description: permission.description,
        category: permission.category
      });
    } else {
      setSelectedPermission(null);
      setNewPermission({ name: '', description: '', category: 'general' });
    }
    setEditDialogOpen(true);
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mobile-subtitle">Permissions Management</h2>
          <p className="text-muted-foreground mobile-text-sm">
            Configure system permissions and role-based access control
          </p>
        </div>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openEditDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedPermission ? 'Edit Permission' : 'Create New Permission'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Permission Name</Label>
                <Input
                  id="name"
                  value={newPermission.name}
                  onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                  placeholder="e.g., manage_users"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  placeholder="Describe what this permission allows"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newPermission.category}
                  onValueChange={(value) => setNewPermission({ ...newPermission, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="User Management">User Management</SelectItem>
                    <SelectItem value="Team Management">Team Management</SelectItem>
                    <SelectItem value="Medical Access">Medical Access</SelectItem>
                    <SelectItem value="Financial Management">Financial Management</SelectItem>
                    <SelectItem value="System Administration">System Administration</SelectItem>
                    <SelectItem value="Content Management">Content Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={selectedPermission ? updatePermission : createPermission}
                  className="flex-1"
                >
                  {selectedPermission ? 'Update' : 'Create'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissions by Category */}
      <div className="grid gap-6">
        {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                {category}
                <Badge variant="secondary">
                  {categoryPermissions.length} permissions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {categoryPermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {permission.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(permission)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePermission(permission.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            User Permissions Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userPermissions.map((userPerm) => (
              <div key={userPerm.user_id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{userPerm.user_name}</p>
                    <p className="text-sm text-muted-foreground">{userPerm.user_email}</p>
                  </div>
                  <div className="flex gap-1">
                    {userPerm.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {userPerm.permissions.map((perm, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {perm.name || 'Permission'}
                    </Badge>
                  ))}
                  {userPerm.permissions.length === 0 && (
                    <span className="text-sm text-muted-foreground">No additional permissions</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};