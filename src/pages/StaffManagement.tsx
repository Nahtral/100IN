import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { useRequireSuperAdmin } from '@/hooks/useRequireRole';
import { StaffManagement } from '@/components/admin/StaffManagement';

const StaffManagementPage = () => {
  const { loading, authorized } = useRequireSuperAdmin();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!authorized) {
    return null; // useRequireSuperAdmin handles unauthorized redirect
  }

  return (
    <Layout>
      <StaffManagement />
    </Layout>
  );
};

export default StaffManagementPage;