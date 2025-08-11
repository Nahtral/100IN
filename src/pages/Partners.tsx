import React from 'react';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import PartnerDashboard from '@/components/dashboards/PartnerDashboard';

const Partners = () => {
  return (
    <RoleProtectedRoute allowedRoles={['super_admin', 'partner']}>
      <div className="mobile-section">
        <div>
          <h1 className="mobile-title">Partners</h1>
          <p className="text-muted-foreground mobile-text">
            Manage partnerships and sponsor relationships
          </p>
        </div>
        <PartnerDashboard />
      </div>
    </RoleProtectedRoute>
  );
};

export default Partners;