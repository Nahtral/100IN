import React from 'react';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import MedicalDashboard from '@/components/dashboards/MedicalDashboard';

const Medical = () => {
  return (
    <RoleProtectedRoute allowedRoles={['super_admin', 'medical']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor player health and medical information
          </p>
        </div>
        <MedicalDashboard />
      </div>
    </RoleProtectedRoute>
  );
};

export default Medical;