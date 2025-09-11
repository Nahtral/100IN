import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Activity, Heart, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PlayerStats {
  totalShots: number;
  totalMakes: number;
  shootingPercentage: number;
  avgPoints: number;
  gamesPlayed: number;
  fitnessScore: number;
  checkInStreak: number;
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

  if (!stats) {
    return (
      <Card className="card-enhanced">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No statistics available yet
          </p>
        </CardContent>
      </Card>
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
          <CardTitle className="mobile-text-sm font-medium">Shooting %</CardTitle>
          <Target className="h-4 w-4 text-panthers-red" />
        </CardHeader>
        <CardContent>
          <div className="mobile-text text-2xl font-bold">
            {stats.shootingPercentage.toFixed(1)}%
          </div>
          <p className="mobile-text-sm text-muted-foreground">
            {stats.totalMakes}/{stats.totalShots} shots
          </p>
        </CardContent>
      </Card>

      {/* Average Points */}
      <Card className="card-enhanced border-l-4" style={{ borderLeftColor: 'hsl(var(--panther-blue))' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="mobile-text-sm font-medium">Avg Points</CardTitle>
          <Activity className="h-4 w-4 text-panther-blue" />
        </CardHeader>
        <CardContent>
          <div className="mobile-text text-2xl font-bold">
            {stats.avgPoints.toFixed(1)}
          </div>
          <p className="mobile-text-sm text-muted-foreground">
            Per session ({stats.gamesPlayed} sessions)
          </p>
        </CardContent>
      </Card>

      {/* Fitness Score */}
      <Card className="card-enhanced border-l-4" style={{ borderLeftColor: 'hsl(var(--deep-teal))' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="mobile-text-sm font-medium">Fitness</CardTitle>
          <Heart className={`h-4 w-4 ${getFitnessColor(stats.fitnessScore)}`} />
        </CardHeader>
        <CardContent>
          <div className={`mobile-text text-2xl font-bold ${getFitnessColor(stats.fitnessScore)}`}>
            {stats.fitnessScore}
          </div>
          <p className="mobile-text-sm text-muted-foreground">
            Health score
          </p>
        </CardContent>
      </Card>

      {/* Check-in Streak */}
      <Card className="card-enhanced border-l-4" style={{ borderLeftColor: 'hsl(var(--panther-gold))' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="mobile-text-sm font-medium">Streak</CardTitle>
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