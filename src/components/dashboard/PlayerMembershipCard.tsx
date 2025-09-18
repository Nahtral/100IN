import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MembershipSummary } from '@/hooks/useMembership';

interface PlayerMembershipCardProps {
  membership: MembershipSummary | null;
  loading: boolean;
  error: string | null;
}

export const PlayerMembershipCard: React.FC<PlayerMembershipCardProps> = ({
  membership,
  loading,
  error
}) => {
  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !membership) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active membership</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-success text-success-foreground';
      case 'inactive': return 'bg-destructive text-destructive-foreground';
      case 'paused': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getProgressValue = () => {
    if (membership.allocation_type === 'CLASS_COUNT' && membership.remaining_classes !== null) {
      // Calculate used classes from total - remaining
      const totalClasses = membership.remaining_classes + membership.used_classes;
      return totalClasses > 0 ? (membership.used_classes / totalClasses) * 100 : 0;
    }
    return 0;
  };

  const getRemainingBadgeColor = () => {
    if (membership.allocation_type === 'CLASS_COUNT' && membership.remaining_classes !== null) {
      if (membership.remaining_classes <= 1) return 'bg-destructive text-destructive-foreground';
      if (membership.remaining_classes <= 3) return 'bg-warning text-warning-foreground';
      return 'bg-success text-success-foreground';
    }
    if (membership.allocation_type === 'DATE_RANGE' && membership.days_left !== null) {
      if (membership.days_left <= 1) return 'bg-destructive text-destructive-foreground';
      if (membership.days_left <= 7) return 'bg-warning text-warning-foreground';
      return 'bg-success text-success-foreground';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-panther-blue" />
            Membership
          </div>
          <Badge className={getStatusColor(membership.status)}>
            {membership.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Membership Type */}
        <div className="space-y-2">
          <h4 className="font-semibold">{membership.type}</h4>
          <p className="text-sm text-muted-foreground">
            {membership.allocation_type === 'CLASS_COUNT' && 'Class-based membership'}
            {membership.allocation_type === 'UNLIMITED' && 'Unlimited access'}
            {membership.allocation_type === 'DATE_RANGE' && 'Date-based membership'}
          </p>
        </div>

        {/* Usage Progress (for CLASS_COUNT) */}
        {membership.allocation_type === 'CLASS_COUNT' && membership.allocated_classes && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Classes Used</span>
              <span className="text-sm text-muted-foreground">
                {membership.used_classes} / {membership.allocated_classes}
              </span>
            </div>
            <Progress value={getProgressValue()} className="w-full" />
            <div className="flex justify-between items-center">
              <Badge className={getRemainingBadgeColor()}>
                {membership.remaining_classes} remaining
              </Badge>
              {membership.should_deactivate && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Low balance
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Date Range Info */}
        {membership.allocation_type === 'DATE_RANGE' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Time Remaining</span>
              {membership.days_left !== null && (
                <Badge className={getRemainingBadgeColor()}>
                  {membership.days_left} days left
                </Badge>
              )}
            </div>
            {membership.is_expired && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Expired
              </Badge>
            )}
          </div>
        )}

        {/* Unlimited membership info */}
        {membership.allocation_type === 'UNLIMITED' && (
          <div className="text-center py-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Unlimited Access
            </Badge>
          </div>
        )}

        {/* Membership Dates */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Started {new Date(membership.start_date).toLocaleDateString()}</span>
          </div>
          {membership.end_date && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Expires {new Date(membership.end_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};