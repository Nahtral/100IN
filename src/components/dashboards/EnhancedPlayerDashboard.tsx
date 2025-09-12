import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { usePlayerSchedule } from '@/hooks/usePlayerSchedule';
import { usePlayerGoals } from '@/hooks/usePlayerGoals';
import { usePlayerAttendance } from '@/hooks/usePlayerAttendance';
import { usePlayerMembership } from '@/hooks/usePlayerMembership';
import { usePlayerGrades } from '@/hooks/usePlayerGrades';
import { PlayerStatsCards } from '@/components/dashboard/PlayerStatsCards';
import { PlayerPerformanceChart } from '@/components/dashboard/PlayerPerformanceChart';
import { PlayerGoalsSection } from '@/components/dashboard/PlayerGoalsSection';
import { PlayerScheduleSection } from '@/components/dashboard/PlayerScheduleSection';
import { PlayerAttendanceCard } from '@/components/dashboard/PlayerAttendanceCard';
import { PlayerMembershipCard } from '@/components/dashboard/PlayerMembershipCard';
import { PlayerEvaluationCard } from '@/components/dashboard/PlayerEvaluationCard';
import { EvaluationTrendChart } from '@/components/dashboard/EvaluationTrendChart';
import PlayerGradesCard from '@/components/dashboard/PlayerGradesCard';
import { PlayerDashboardError } from '@/components/dashboard/PlayerDashboardError';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { User, Target, Shield } from 'lucide-react';

// Simple error boundary component
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const EnhancedPlayerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = usePlayerProfile();
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = usePlayerStats(profile?.id);
  const { events, loading: scheduleLoading, error: scheduleError, refetch: refetchSchedule } = usePlayerSchedule(profile?.team_id);
  const { goals, loading: goalsLoading, error: goalsError, refetch: refetchGoals } = usePlayerGoals(profile?.id);
  const { attendance, loading: attendanceLoading, error: attendanceError, refetch: refetchAttendance } = usePlayerAttendance(profile?.id);
  const { membership, loading: membershipLoading, error: membershipError, refetch: refetchMembership } = usePlayerMembership(profile?.id);
  const { grades: playerGrades, loading: gradesLoading, error: gradesError, refetch: refetchGrades } = usePlayerGrades(profile?.id);

  // Show loading skeleton while profile is loading
  if (profileLoading) {
    return <DashboardSkeleton />;
  }

  // Show error if profile failed to load
  if (profileError) {
    return (
      <div className="mobile-container mobile-space-y">
        <PlayerDashboardError
          title="Unable to load player profile"
          message={profileError}
          onRetry={refetchProfile}
        />
      </div>
    );
  }

  // Show message if no player profile exists
  if (!profile) {
    return (
      <div className="mobile-container mobile-space-y">
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h1 className="mobile-title">Welcome!</h1>
            <p className="mobile-text text-muted-foreground mt-2">
              Your player profile is being set up. Please contact your coach if you need assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const playerName = profile.user?.full_name || 
                    `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                    user?.user_metadata?.full_name || 
                    'Player';

  return (
    <div className="mobile-container mobile-space-y">
        {/* Header */}
        <div className="text-center sm:text-left space-y-4">
          <div>
            <h1 className="mobile-title text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Player Dashboard
            </h1>
            <p className="mobile-text text-muted-foreground mt-2">
              Welcome back, {playerName}! Here's your performance overview.
            </p>
          </div>
          
          {profile.team && (
            <div className="flex justify-center sm:justify-start">
              <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full">
                <Shield className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{profile.team.name}</span>
                {profile.jersey_number && (
                  <span className="text-sm text-muted-foreground">#{profile.jersey_number}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <SimpleErrorBoundary 
          fallback={
            <PlayerDashboardError
              title="Stats unavailable"
              message="Unable to load your performance statistics"
              onRetry={refetchStats}
            />
          }
        >
          <PlayerStatsCards 
            stats={stats} 
            loading={statsLoading} 
            error={statsError} 
          />
        </SimpleErrorBoundary>

        {/* Performance and Goals Grid */}
        <div className="mobile-content-grid">
          {/* Performance Chart */}
          <div className="lg:col-span-2">
            <SimpleErrorBoundary 
              fallback={
                <PlayerDashboardError
                  title="Performance chart unavailable"
                  message="Unable to load your recent performance data"
                  onRetry={refetchStats}
                />
              }
            >
              <PlayerPerformanceChart 
                performance={stats?.recentPerformance || []} 
                loading={statsLoading} 
                error={statsError} 
              />
            </SimpleErrorBoundary>
          </div>

          {/* Goals Section */}
          <SimpleErrorBoundary 
            fallback={
              <PlayerDashboardError
                title="Goals unavailable"
                message="Unable to load your development goals"
                onRetry={refetchGoals}
              />
            }
          >
            <PlayerGoalsSection 
              goals={goals} 
              loading={goalsLoading} 
              error={goalsError} 
            />
          </SimpleErrorBoundary>
        </div>

        {/* Attendance and Membership Grid */}
        <div className="mobile-content-grid">
          {/* Attendance Card */}
          <SimpleErrorBoundary 
            fallback={
              <PlayerDashboardError
                title="Attendance unavailable"
                message="Unable to load your attendance data"
                onRetry={refetchAttendance}
              />
            }
          >
            <PlayerAttendanceCard 
              attendance={attendance} 
              loading={attendanceLoading} 
              error={attendanceError} 
            />
          </SimpleErrorBoundary>

          {/* Membership Card */}
          <SimpleErrorBoundary 
            fallback={
              <PlayerDashboardError
                title="Membership unavailable"
                message="Unable to load your membership information"
                onRetry={refetchMembership}
              />
            }
          >
            <PlayerMembershipCard 
              membership={membership} 
              loading={membershipLoading} 
              error={membershipError} 
            />
          </SimpleErrorBoundary>
        </div>

        {/* Evaluation Section */}
        <div className="mobile-content-grid">
          <SimpleErrorBoundary 
            fallback={
              <PlayerDashboardError
                title="Evaluation data unavailable"
                message="Unable to load your evaluation information"
                onRetry={() => {}}
              />
            }
          >
            <PlayerEvaluationCard playerId={profile?.id} />
          </SimpleErrorBoundary>

          <SimpleErrorBoundary 
            fallback={
              <PlayerDashboardError
                title="Grades unavailable"
                message="Unable to load your performance grades"
                onRetry={refetchGrades}
              />
            }
          >
            <PlayerGradesCard grades={playerGrades} loading={gradesLoading} />
          </SimpleErrorBoundary>

          <div className="lg:col-span-2">
            <SimpleErrorBoundary 
              fallback={
                <PlayerDashboardError
                  title="Evaluation trends unavailable"
                  message="Unable to load your evaluation trends"
                  onRetry={() => {}}
                />
              }
            >
              <EvaluationTrendChart playerId={profile?.id} />
            </SimpleErrorBoundary>
          </div>
        </div>

        {/* Schedule Section */}
        <SimpleErrorBoundary 
          fallback={
            <PlayerDashboardError
              title="Schedule unavailable"
              message="Unable to load your upcoming schedule"
              onRetry={refetchSchedule}
            />
          }
        >
          <PlayerScheduleSection 
            events={events} 
            loading={scheduleLoading} 
            error={scheduleError} 
          />
        </SimpleErrorBoundary>

        {/* Quick Actions Footer */}
        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Keep pushing towards your goals!</span>
          </div>
        </div>
      </div>
  );
};