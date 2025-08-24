import React from 'react';
import Layout from '@/components/layout/Layout';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SecurityDashboard from '@/components/security/SecurityDashboard';

const Security = () => {
  const { currentUser } = useCurrentUser();

  return (
    <RoleProtectedRoute allowedRoles={['super_admin']}>
      <Layout currentUser={currentUser}>
        <SecurityDashboard />
      </Layout>
    </RoleProtectedRoute>
  );
};

export default Security;