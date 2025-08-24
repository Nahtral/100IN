import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotificationHelpers } from '@/hooks/useNotificationHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const NotificationDemo: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    notifyChatMessage,
    notifyScheduleChange,
    notifyInjuryReport,
    notifyEvaluationComplete,
    notifyTeamAnnouncement,
    notifyTimeOffApproved,
    notifySystemMaintenance,
    notifySecurityAlert,
  } = useNotificationHelpers();

  if (!user) return null;

  const handleTestNotification = async (type: string) => {
    try {
      switch (type) {
        case 'chat':
          await notifyChatMessage(
            user.id,
            'Coach Johnson',
            'chat-123',
            'Great practice today! Keep up the excellent work team.'
          );
          break;
        
        case 'schedule':
          await notifyScheduleChange(
            [user.id],
            'Practice Moved',
            'Tomorrow\'s practice has been moved to 6:00 PM due to gym availability',
            'schedule-456'
          );
          break;
        
        case 'injury':
          await notifyInjuryReport(
            [user.id],
            'Alex Rodriguez',
            'ankle sprain',
            'injury-789'
          );
          break;
        
        case 'evaluation':
          await notifyEvaluationComplete(
            user.id,
            'Jordan Smith',
            'eval-101',
            85
          );
          break;
        
        case 'announcement':
          await notifyTeamAnnouncement(
            [user.id],
            'Team Pizza Party',
            'Join us this Friday after practice for a team celebration!',
            'news-202'
          );
          break;
        
        case 'timeoff':
          await notifyTimeOffApproved(
            user.id,
            '2024-03-15',
            '2024-03-17'
          );
          break;
        
        case 'maintenance':
          await notifySystemMaintenance(
            [user.id],
            'Saturday 2:00 AM',
            '2 hours'
          );
          break;
        
        case 'security':
          await notifySecurityAlert(
            [user.id],
            'Failed Login Attempts',
            'Multiple failed login attempts detected from an unknown device'
          );
          break;
      }
      
      toast({
        title: "Test notification sent!",
        description: `A ${type} notification has been created.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create test notification",
        variant: "destructive",
      });
    }
  };

  const notifications = [
    { type: 'chat', label: 'Chat Message', color: 'bg-blue-500' },
    { type: 'schedule', label: 'Schedule Change', color: 'bg-orange-500' },
    { type: 'injury', label: 'Injury Report', color: 'bg-red-500' },
    { type: 'evaluation', label: 'Evaluation Complete', color: 'bg-green-500' },
    { type: 'announcement', label: 'Team Announcement', color: 'bg-purple-500' },
    { type: 'timeoff', label: 'Time-off Approved', color: 'bg-teal-500' },
    { type: 'maintenance', label: 'System Maintenance', color: 'bg-gray-500' },
    { type: 'security', label: 'Security Alert', color: 'bg-red-600' },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Notification System Demo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test different types of notifications to see the system in action.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {notifications.map(({ type, label, color }) => (
            <Button
              key={type}
              variant="outline"
              onClick={() => handleTestNotification(type)}
              className="justify-start"
            >
              <div className={`w-3 h-3 rounded-full ${color} mr-2`} />
              {label}
            </Button>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">How to test:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Click any button above to create a test notification</li>
            <li>• Check the bell icon in the header for unread count</li>
            <li>• Click the bell to open the notification center</li>
            <li>• High priority notifications will show as toasts</li>
            <li>• Notifications update in real-time</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};