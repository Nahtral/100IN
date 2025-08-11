import React from 'react';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import MedicalDashboard from '@/components/dashboards/MedicalDashboard';

const Medical = () => {
  return (
    <RoleProtectedRoute allowedRoles={['super_admin', 'medical']}>
      <div className="mobile-section">
        <div>
          <h1 className="mobile-title">Medical Dashboard</h1>
          <p className="text-muted-foreground mobile-text">
            Monitor player health and medical information
          </p>
        </div>
        <MedicalDashboard />
      </div>
    </RoleProtectedRoute>
  );
};

export default Medical;