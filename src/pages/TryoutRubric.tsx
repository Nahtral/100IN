import React from 'react';
import Layout from '@/components/layout/Layout';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import TryoutRubricDashboard from '@/components/admin/TryoutRubricDashboard';

const TryoutRubric = () => {
  const { currentUser } = useCurrentUser();

  return (
    <RoleProtectedRoute allowedRoles={['super_admin']}>
      <Layout currentUser={currentUser}>
        <TryoutRubricDashboard />
      </Layout>
    </RoleProtectedRoute>
  );
};

export default TryoutRubric;