import React, { Suspense, lazy } from 'react';

// Lazy load all HR components for better performance
const SecureEmployeeList = lazy(() => import('@/components/hr/SecureEmployeeList'));
const TimeTracking = lazy(() => import('@/components/hr/TimeTracking'));
const TimeOffManagement = lazy(() => import('@/components/hr/TimeOffManagement'));
const PayrollDashboard = lazy(() => import('@/components/hr/PayrollDashboard'));
const BenefitsManagement = lazy(() => import('@/components/hr/BenefitsManagement'));
const OnboardingTasks = lazy(() => import('@/components/hr/OnboardingTasks'));
const EmployeeScheduling = lazy(() => import('@/components/hr/EmployeeScheduling'));
const EmployeeSelfService = lazy(() => import('@/components/hr/EmployeeSelfService'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

interface LazyHRComponentProps {
  onStatsUpdate: () => void;
}

export const LazySecureEmployeeList = ({ onStatsUpdate }: LazyHRComponentProps) => (
  <Suspense fallback={<LoadingFallback />}>
    <SecureEmployeeList onStatsUpdate={onStatsUpdate} />
  </Suspense>
);

export const LazyTimeTracking = ({ onStatsUpdate }: LazyHRComponentProps) => (
  <Suspense fallback={<LoadingFallback />}>
    <TimeTracking onStatsUpdate={onStatsUpdate} />
  </Suspense>
);

export const LazyTimeOffManagement = ({ onStatsUpdate }: LazyHRComponentProps) => (
  <Suspense fallback={<LoadingFallback />}>
    <TimeOffManagement onStatsUpdate={onStatsUpdate} />
  </Suspense>
);

export const LazyPayrollDashboard = ({ onStatsUpdate }: LazyHRComponentProps) => (
  <Suspense fallback={<LoadingFallback />}>
    <PayrollDashboard onStatsUpdate={onStatsUpdate} />
  </Suspense>
);

export const LazyBenefitsManagement = ({ onStatsUpdate }: LazyHRComponentProps) => (
  <Suspense fallback={<LoadingFallback />}>
    <BenefitsManagement onStatsUpdate={onStatsUpdate} />
  </Suspense>
);

export const LazyOnboardingTasks = ({ onStatsUpdate }: LazyHRComponentProps) => (
  <Suspense fallback={<LoadingFallback />}>
    <OnboardingTasks onStatsUpdate={onStatsUpdate} />
  </Suspense>
);

export const LazyEmployeeScheduling = ({ onStatsUpdate }: LazyHRComponentProps) => (
  <Suspense fallback={<LoadingFallback />}>
    <EmployeeScheduling onStatsUpdate={onStatsUpdate} />
  </Suspense>
);

export const LazyEmployeeSelfService = () => (
  <Suspense fallback={<LoadingFallback />}>
    <EmployeeSelfService />
  </Suspense>
);