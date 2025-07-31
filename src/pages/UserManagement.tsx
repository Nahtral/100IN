import React from 'react';
import Layout from '@/components/layout/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import EnhancedUserManagement from '@/components/user-management/EnhancedUserManagement';

const UserManagement = () => {
  const { currentUser } = useCurrentUser();

  return (
    <Layout currentUser={currentUser}>
      <EnhancedUserManagement />
    </Layout>
  );
};

export default UserManagement;