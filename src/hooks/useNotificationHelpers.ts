import { useNotifications } from './useNotifications';
import { useAuth } from '@/contexts/AuthContext';

// Helper hook for creating specific notification types
export const useNotificationHelpers = () => {
  const { createNotification } = useNotifications();
  const { user } = useAuth();

  // Chat notifications
  const notifyChatMessage = async (
    recipientId: string, 
    senderName: string, 
    chatId: string, 
    message: string
  ) => {
    return createNotification(
      recipientId,
      'chat_message',
      `New message from ${senderName}`,
      message.length > 100 ? message.substring(0, 100) + '...' : message,
      { chatId, senderId: user?.id },
      'normal',
      `/chat?id=${chatId}`
    );
  };

  const notifyChatMention = async (
    recipientId: string, 
    senderName: string, 
    chatId: string, 
    message: string
  ) => {
    return createNotification(
      recipientId,
      'chat_mention',
      `${senderName} mentioned you`,
      message.length > 100 ? message.substring(0, 100) + '...' : message,
      { chatId, senderId: user?.id },
      'high',
      `/chat?id=${chatId}`
    );
  };

  // Schedule notifications
  const notifyScheduleChange = async (
    recipientIds: string[], 
    title: string, 
    description: string, 
    scheduleId: string
  ) => {
    const promises = recipientIds.map(recipientId => 
      createNotification(
        recipientId,
        'schedule_change',
        title,
        description,
        { scheduleId },
        'high',
        `/schedule?id=${scheduleId}`
      )
    );
    return Promise.all(promises);
  };

  const notifyScheduleReminder = async (
    recipientIds: string[], 
    eventTitle: string, 
    startTime: string, 
    scheduleId: string
  ) => {
    const promises = recipientIds.map(recipientId => 
      createNotification(
        recipientId,
        'schedule_reminder',
        `Upcoming: ${eventTitle}`,
        `Your event starts at ${startTime}`,
        { scheduleId, startTime },
        'normal',
        `/schedule?id=${scheduleId}`,
        'schedule',
        scheduleId,
        2 // Expires in 2 hours
      )
    );
    return Promise.all(promises);
  };

  // Medical notifications
  const notifyInjuryReport = async (
    recipientIds: string[], 
    playerName: string, 
    injuryType: string, 
    reportId: string
  ) => {
    const promises = recipientIds.map(recipientId => 
      createNotification(
        recipientId,
        'injury_report',
        `Injury Report: ${playerName}`,
        `New ${injuryType} injury reported`,
        { playerId: playerName, injuryType, reportId },
        'urgent',
        `/medical?report=${reportId}`
      )
    );
    return Promise.all(promises);
  };

  const notifyMedicalClearance = async (
    recipientId: string, 
    playerName: string, 
    status: string
  ) => {
    return createNotification(
      recipientId,
      'medical_clearance',
      `Medical Clearance Update`,
      `${playerName} has been ${status}`,
      { playerName, status },
      'high',
      '/medical'
    );
  };

  const notifyHealthCheckReminder = async (recipientId: string) => {
    return createNotification(
      recipientId,
      'health_check_reminder',
      'Daily Health Check-in',
      'Please complete your daily health check-in',
      {},
      'normal',
      '/health-wellness',
      'reminder',
      undefined,
      24 // Expires in 24 hours
    );
  };

  // Performance notifications
  const notifyEvaluationComplete = async (
    recipientId: string, 
    playerName: string, 
    evaluationId: string, 
    score?: number
  ) => {
    return createNotification(
      recipientId,
      'evaluation_complete',
      'Evaluation Complete',
      `Performance evaluation for ${playerName} is ready${score ? ` (Score: ${score})` : ''}`,
      { playerName, evaluationId, score },
      'normal',
      `/evaluations?id=${evaluationId}`
    );
  };

  const notifyPerformanceMilestone = async (
    recipientId: string, 
    milestone: string, 
    description: string
  ) => {
    return createNotification(
      recipientId,
      'performance_milestone',
      `Milestone Achieved!`,
      `${milestone}: ${description}`,
      { milestone },
      'normal'
    );
  };

  // Team notifications
  const notifyTeamAnnouncement = async (
    recipientIds: string[], 
    title: string, 
    message: string, 
    announcementId?: string
  ) => {
    const promises = recipientIds.map(recipientId => 
      createNotification(
        recipientId,
        'team_announcement',
        title,
        message,
        { announcementId },
        'normal',
        announcementId ? `/news?id=${announcementId}` : undefined
      )
    );
    return Promise.all(promises);
  };

  const notifyRosterUpdate = async (
    recipientIds: string[], 
    updateType: string, 
    playerName: string, 
    teamId: string
  ) => {
    const promises = recipientIds.map(recipientId => 
      createNotification(
        recipientId,
        'roster_update',
        'Team Roster Update',
        `${playerName} ${updateType}`,
        { updateType, playerName, teamId },
        'normal',
        `/teams?id=${teamId}`
      )
    );
    return Promise.all(promises);
  };

  // HR notifications
  const notifyTimeOffApproved = async (
    recipientId: string, 
    startDate: string, 
    endDate: string
  ) => {
    return createNotification(
      recipientId,
      'timeoff_approved',
      'Time-off Request Approved',
      `Your time-off from ${startDate} to ${endDate} has been approved`,
      { startDate, endDate },
      'normal',
      '/teamgrid'
    );
  };

  const notifyTimeOffDenied = async (
    recipientId: string, 
    startDate: string, 
    endDate: string, 
    reason?: string
  ) => {
    return createNotification(
      recipientId,
      'timeoff_denied',
      'Time-off Request Denied',
      `Your time-off from ${startDate} to ${endDate} was denied${reason ? `: ${reason}` : ''}`,
      { startDate, endDate, reason },
      'high',
      '/teamgrid'
    );
  };

  const notifyTaskAssigned = async (
    recipientId: string, 
    taskTitle: string, 
    dueDate: string, 
    taskId: string
  ) => {
    return createNotification(
      recipientId,
      'task_assigned',
      'New Task Assigned',
      `${taskTitle} - Due: ${dueDate}`,
      { taskId, dueDate },
      'normal',
      `/tasks?id=${taskId}`
    );
  };

  // System notifications
  const notifySystemMaintenance = async (
    recipientIds: string[], 
    scheduledTime: string, 
    duration: string
  ) => {
    const promises = recipientIds.map(recipientId => 
      createNotification(
        recipientId,
        'system_maintenance',
        'Scheduled Maintenance',
        `System maintenance scheduled for ${scheduledTime} (${duration})`,
        { scheduledTime, duration },
        'normal',
        undefined,
        'maintenance',
        undefined,
        168 // Expires in 1 week
      )
    );
    return Promise.all(promises);
  };

  const notifySecurityAlert = async (
    recipientIds: string[], 
    alertType: string, 
    description: string
  ) => {
    const promises = recipientIds.map(recipientId => 
      createNotification(
        recipientId,
        'security_alert',
        `Security Alert: ${alertType}`,
        description,
        { alertType },
        'urgent',
        '/security'
      )
    );
    return Promise.all(promises);
  };

  return {
    // Chat
    notifyChatMessage,
    notifyChatMention,
    
    // Schedule
    notifyScheduleChange,
    notifyScheduleReminder,
    
    // Medical
    notifyInjuryReport,
    notifyMedicalClearance,
    notifyHealthCheckReminder,
    
    // Performance
    notifyEvaluationComplete,
    notifyPerformanceMilestone,
    
    // Team
    notifyTeamAnnouncement,
    notifyRosterUpdate,
    
    // HR
    notifyTimeOffApproved,
    notifyTimeOffDenied,
    notifyTaskAssigned,
    
    // System
    notifySystemMaintenance,
    notifySecurityAlert,
  };
};