import React from 'react';
import Layout from '@/components/layout/Layout';
import { MembershipTypesManagement } from '@/components/admin/MembershipTypesManagement';

const MembershipTypes = () => {
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <MembershipTypesManagement />
      </div>
    </Layout>
  );
};

export default MembershipTypes;