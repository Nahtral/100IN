import React from 'react';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import PartnerDashboard from '@/components/dashboards/PartnerDashboard';

const Partners = () => {
  return (
    <RoleProtectedRoute allowedRoles={['super_admin', 'partner']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-muted-foreground">
            Manage partnerships and sponsor relationships
          </p>
        </div>
        <PartnerDashboard />
      </div>
    </RoleProtectedRoute>
  );
};

export default Partners;