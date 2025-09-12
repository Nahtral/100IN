import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Activity, Heart, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataQualityIndicator } from '@/components/ui/data-quality-indicator';
import { DataInputPrompt } from '@/components/ui/data-input-prompt';

interface PlayerStats {
  totalShots: number;
  totalMakes: number;
  shootingPercentage: number;
  avgPoints: number;
  gamesPlayed: number;
  fitnessScore: number;
  checkInStreak: number;
  // Data quality metadata
  shotsDataQuality?: {
    confidence: 'high' | 'medium' | 'low';
    lastUpdated?: string;
    missingData?: string[];
  };
  fitnessDataQuality?: {
    confidence: 'high' | 'medium' | 'low';
    lastUpdated?: string;
    missingData?: string[];
  };
}

interface PlayerStatsCardsProps {
  stats: PlayerStats | null;
  loading: boolean;
  error: string | null;
}

export const PlayerStatsCards: React.FC<PlayerStatsCardsProps> = ({
  stats,
  loading,
  error
}) => {
  if (loading) {
    return (
      <div className="mobile-metrics-grid">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="card-enhanced">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="card-enhanced">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Unable to load stats: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!stats || (stats.totalShots === 0 && stats.fitnessScore === 0 && stats.checkInStreak === 0)) {
    return (
      <div className="mobile-metrics-grid">
        <DataInputPrompt
          dataType="Training Sessions"
          message="Start your first training session to see your shooting statistics."
          actionLabel="Log Training Session"
          onAction={() => window.location.href = '/shotiq'}
          priority="high"
          suggestions={['Practice shots', 'Record performance', 'Track progress']}
        />
        <DataInputPrompt
          dataType="Health Check-in"
          message="Complete daily check-ins to track your fitness and wellness."
          actionLabel="Daily Check-in"
          onAction={() => window.location.href = '/health-wellness'}
          priority="medium"
          suggestions={['Energy level', 'Sleep quality', 'Overall wellness']}
        />
      </div>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'bg-green-500';
    if (streak >= 3) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getFitnessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="mobile-metrics-grid">
      {/* Shooting Percentage */}
      <Card className="card-enhanced border-l-4" style={{ borderLeftColor: 'hsl(var(--panthers-red))' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="mobile-text-sm font-medium">Shooting %</CardTitle>
            {stats.totalShots > 0 && (
              <DataQualityIndicator
                totalRecords={stats.totalShots}
                sourceType="shot"
                confidence={stats.shotsDataQuality?.confidence || (stats.totalShots >= 50 ? 'high' : stats.totalShots >= 20 ? 'medium' : 'low')}
                lastUpdated={stats.shotsDataQuality?.lastUpdated}
                missingData={stats.shotsDataQuality?.missingData}
              />
            )}
          </div>
          <Target className="h-4 w-4 text-panthers-red" />
        </CardHeader>
        <CardContent>
          <div className="mobile-text text-2xl font-bold">
            {stats.totalShots > 0 ? stats.shootingPercentage.toFixed(1) : '--'}%
          </div>
          <p className="mobile-text-sm text-muted-foreground">
            {stats.totalShots > 0 ? `${stats.totalMakes}/${stats.totalShots} shots` : 'No shots recorded'}
          </p>
        </CardContent>
      </Card>

      {/* Average Points */}
      <Card className="card-enhanced border-l-4" style={{ borderLeftColor: 'hsl(var(--panther-blue))' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="mobile-text-sm font-medium">Avg Points</CardTitle>
            {stats.gamesPlayed > 0 && (
              <DataQualityIndicator
                totalRecords={stats.gamesPlayed}
                sourceType="session"
                confidence={stats.gamesPlayed >= 10 ? 'high' : stats.gamesPlayed >= 5 ? 'medium' : 'low'}
              />
            )}
          </div>
          <Activity className="h-4 w-4 text-panther-blue" />
        </CardHeader>
        <CardContent>
          <div className="mobile-text text-2xl font-bold">
            {stats.gamesPlayed > 0 ? stats.avgPoints.toFixed(1) : '--'}
          </div>
          <p className="mobile-text-sm text-muted-foreground">
            {stats.gamesPlayed > 0 ? `Per session (${stats.gamesPlayed} sessions)` : 'No sessions recorded'}
          </p>
        </CardContent>
      </Card>

      {/* Fitness Score */}
      <Card className="card-enhanced border-l-4" style={{ borderLeftColor: 'hsl(var(--deep-teal))' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="mobile-text-sm font-medium">Fitness</CardTitle>
            {stats.fitnessScore > 0 && (
              <DataQualityIndicator
                totalRecords={1}
                sourceType="health check-in"
                confidence={stats.fitnessDataQuality?.confidence || (stats.checkInStreak >= 7 ? 'high' : stats.checkInStreak >= 3 ? 'medium' : 'low')}
                lastUpdated={stats.fitnessDataQuality?.lastUpdated}
                missingData={stats.fitnessDataQuality?.missingData}
              />
            )}
          </div>
          <Heart className={`h-4 w-4 ${getFitnessColor(stats.fitnessScore)}`} />
        </CardHeader>
        <CardContent>
          <div className={`mobile-text text-2xl font-bold ${getFitnessColor(stats.fitnessScore)}`}>
            {stats.fitnessScore > 0 ? stats.fitnessScore : '--'}
          </div>
          <p className="mobile-text-sm text-muted-foreground">
            {stats.fitnessScore > 0 ? 'Health score' : 'Complete check-in'}
          </p>
        </CardContent>
      </Card>

      {/* Check-in Streak */}
      <Card className="card-enhanced border-l-4" style={{ borderLeftColor: 'hsl(var(--panther-gold))' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="mobile-text-sm font-medium">Streak</CardTitle>
            <DataQualityIndicator
              totalRecords={stats.checkInStreak}
              sourceType="check-in"
              confidence={stats.checkInStreak >= 7 ? 'high' : stats.checkInStreak >= 3 ? 'medium' : 'low'}
            />
          </div>
          <TrendingUp className="h-4 w-4 text-panther-gold" />
        </CardHeader>
        <CardContent>
          <div className="mobile-text text-2xl font-bold flex items-center gap-2">
            {stats.checkInStreak}
            <div className={`w-2 h-2 rounded-full ${getStreakColor(stats.checkInStreak)}`} />
          </div>
          <p className="mobile-text-sm text-muted-foreground">
            Daily check-ins
          </p>
        </CardContent>
      </Card>
    </div>
  );
};