import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Users, AlertTriangle, Settings } from 'lucide-react';
import { MembershipSummary } from '@/hooks/useMembership';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface MembershipCardProps {
  summary: MembershipSummary | null;
  loading: boolean;
  onToggleOverride?: (active: boolean) => void;
  onSendReminder?: () => void;
  onAdjustUsage?: () => void;
  showAdminControls?: boolean;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({
  summary,
  loading,
  onToggleOverride,
  onSendReminder,
  onAdjustUsage,
  showAdminControls = false
}) => {
  const { isSuperAdmin } = useUserRole();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active membership found</p>
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
    if (summary.allocation_type === 'CLASS_COUNT' && summary.allocated_classes) {
      return (summary.used_classes / summary.allocated_classes) * 100;
    }
    return 0;
  };

  const getRemainingBadgeColor = () => {
    if (summary.allocation_type === 'CLASS_COUNT' && summary.remaining_classes !== null) {
      if (summary.remaining_classes <= 1) return 'bg-destructive text-destructive-foreground';
      if (summary.remaining_classes <= 3) return 'bg-warning text-warning-foreground';
      return 'bg-success text-success-foreground';
    }
    if (summary.allocation_type === 'DATE_RANGE' && summary.days_left !== null) {
      if (summary.days_left <= 1) return 'bg-destructive text-destructive-foreground';
      if (summary.days_left <= 7) return 'bg-warning text-warning-foreground';
      return 'bg-success text-success-foreground';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership Information
          </div>
          <Badge className={getStatusColor(summary.status)}>
            {summary.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Membership Type and Dates */}
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-lg">{summary.type}</h4>
            <p className="text-sm text-muted-foreground">
              {summary.allocation_type === 'CLASS_COUNT' && 'Class-based membership'}
              {summary.allocation_type === 'UNLIMITED' && 'Unlimited access'}
              {summary.allocation_type === 'DATE_RANGE' && 'Date-based membership'}
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Started: {new Date(summary.start_date).toLocaleDateString()}</span>
            </div>
            {summary.end_date && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Expires: {new Date(summary.end_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Usage Progress (for CLASS_COUNT) */}
        {summary.allocation_type === 'CLASS_COUNT' && summary.allocated_classes && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Class Usage</span>
              <span className="text-sm text-muted-foreground">
                {summary.used_classes} / {summary.allocated_classes}
              </span>
            </div>
            <Progress value={getProgressValue()} className="w-full" />
            <div className="flex justify-between items-center">
              <Badge className={getRemainingBadgeColor()}>
                {summary.remaining_classes} classes remaining
              </Badge>
              {summary.should_deactivate && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Auto-deactivation pending
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Date Range Info */}
        {summary.allocation_type === 'DATE_RANGE' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Time Remaining</span>
              {summary.days_left !== null && (
                <Badge className={getRemainingBadgeColor()}>
                  {summary.days_left} days left
                </Badge>
              )}
            </div>
            {summary.is_expired && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Membership expired
              </Badge>
            )}
          </div>
        )}

        {/* Unlimited membership info */}
        {summary.allocation_type === 'UNLIMITED' && (
          <div className="text-center py-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Unlimited Access
            </Badge>
          </div>
        )}

        {/* Admin Controls */}
        {showAdminControls && isSuperAdmin && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Admin Controls</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Manual Override Active</span>
                <Switch
                  onCheckedChange={(checked) => onToggleOverride?.(checked)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onSendReminder}
                  className="flex-1"
                >
                  Send Reminder
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onAdjustUsage}
                  className="flex-1"
                >
                  Adjust Usage
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};