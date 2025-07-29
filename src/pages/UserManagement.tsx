import React from 'react';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import SecureUserManagement from '@/components/SecureUserManagement';

const UserManagement = () => {
  return (
    <RoleProtectedRoute allowedRoles={['staff', 'super_admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Secure user account and role management
          </p>
        </div>
        <SecureUserManagement />
      </div>
    </RoleProtectedRoute>
  );
};

export default UserManagement;