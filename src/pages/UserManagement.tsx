import React from 'react';
import Layout from '@/components/layout/Layout';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import EnhancedUserManagement from '@/components/user-management/EnhancedUserManagement';

const UserManagement = () => {
  const { currentUser } = useCurrentUser();

  return (
    <RoleProtectedRoute allowedRoles={['super_admin']}>
      <Layout currentUser={currentUser}>
        <EnhancedUserManagement />
      </Layout>
    </RoleProtectedRoute>
  );
};

export default UserManagement;