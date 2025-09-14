import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle, Calendar, Clock, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerMembershipUpdated } from '@/hooks/usePlayerMembershipUpdated';

interface EnhancedPlayerMembershipCardProps {
  playerId: string;
}

export const EnhancedPlayerMembershipCard: React.FC<EnhancedPlayerMembershipCardProps> = ({
  playerId
}) => {
  const { membershipUsage, attendanceSummary, loading } = usePlayerMembershipUpdated(playerId);

  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership & Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!membershipUsage || !membershipUsage.has_active_membership) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership & Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active membership</p>
            {attendanceSummary && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-green-600">{attendanceSummary.present_count}</div>
                  <div className="text-muted-foreground">Present</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{attendanceSummary.absent_count}</div>
                  <div className="text-muted-foreground">Absent</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressValue = () => {
    // Since we don't have total allocated classes in the new system,
    // we'll show progress based on remaining credits
    const maxExpected = 50; // Assume a typical max allocation
    const used = Math.max(0, maxExpected - membershipUsage.credits_remaining);
    return Math.min(100, (used / maxExpected) * 100);
  };

  const getRemainingBadgeColor = () => {
    if (membershipUsage.credits_remaining <= 1) return 'bg-destructive text-destructive-foreground';
    if (membershipUsage.credits_remaining <= 5) return 'bg-warning text-warning-foreground';
    return 'bg-success text-success-foreground';
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-panther-blue" />
            Membership & Attendance
          </div>
          <Badge className="bg-success text-success-foreground">
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credits Remaining */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Classes Remaining</span>
            <div className="flex items-center gap-2">
              <Badge className={getRemainingBadgeColor()}>
                {membershipUsage.credits_remaining} credits
              </Badge>
              <Zap className="h-4 w-4 text-panther-gold" />
            </div>
          </div>
          
          <Progress value={getProgressValue()} className="w-full" />
          
          {membershipUsage.credits_remaining <= 5 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-warning">Low credit balance</span>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        {attendanceSummary && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Attendance Summary</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="font-bold text-green-600 text-lg">
                  {attendanceSummary.present_count}
                </div>
                <div className="text-xs text-green-600">Present</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                <div className="font-bold text-yellow-600 text-lg">
                  {attendanceSummary.late_count}
                </div>
                <div className="text-xs text-yellow-600">Late</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="font-bold text-red-600 text-lg">
                  {attendanceSummary.absent_count}
                </div>
                <div className="text-xs text-red-600">Absent</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="font-bold text-blue-600 text-lg">
                  {attendanceSummary.excused_count}
                </div>
                <div className="text-xs text-blue-600">Excused</div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Rate */}
        {attendanceSummary && (
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {attendanceSummary.present_count + attendanceSummary.late_count > 0 
                ? Math.round(
                    ((attendanceSummary.present_count + attendanceSummary.late_count) / 
                     (attendanceSummary.present_count + attendanceSummary.late_count + attendanceSummary.absent_count)) * 100
                  )
                : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Attendance Rate</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};