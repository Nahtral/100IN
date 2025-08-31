import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { Clock, RefreshCw, Activity, User } from 'lucide-react';

interface ActivityFeedProps {
  userId?: string;
  showRefresh?: boolean;
  maxHeight?: string;
}

const ActivityFeed = ({ userId, showRefresh = true, maxHeight = "400px" }: ActivityFeedProps) => {
  const { activities, loading, refreshActivities } = useActivityTracking(userId);

  const getActivityIcon = (iconName: string) => {
    // Simplified icon mapping for activity feed
    switch (iconName) {
      case 'LogIn': return '🔐';
      case 'Shield': return '🛡️';
      case 'User': return '👤';
      case 'Eye': return '👁️';
      case 'Database': return '🗄️';
      case 'AlertTriangle': return '⚠️';
      case 'Activity': return '⚡';
      default: return '📝';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Authentication': return 'bg-blue-50 text-blue-700';
      case 'Permissions': return 'bg-purple-50 text-purple-700';
      case 'Account': return 'bg-green-50 text-green-700';
      case 'Data Access': return 'bg-yellow-50 text-yellow-700';
      case 'Security': return 'bg-red-50 text-red-700';
      case 'Navigation': return 'bg-gray-50 text-gray-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Feed
          </CardTitle>
          {showRefresh && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshActivities}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading activities...</p>
          </div>
        ) : activities.length > 0 ? (
          <div 
            className="space-y-3 overflow-y-auto"
            style={{ maxHeight }}
          >
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="text-lg mt-0.5">
                  {getActivityIcon(activity.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs whitespace-nowrap ${getCategoryColor(activity.category)}`}
                      >
                        {activity.category}
                      </Badge>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(activity.created_at)}
                      </time>
                    </div>
                  </div>
                  {activity.event_data?.url && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {new URL(activity.event_data.url).pathname}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No activities found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Activities will appear here as users interact with the system
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;