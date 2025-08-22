import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  to: string | string[];
  subject: string;
  message: string;
  type: 'welcome' | 'notification' | 'alert' | 'reminder' | 'medical_alert' | 'appointment_reminder' | 'schedule_update';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  data?: {
    playerName?: string;
    appointmentDate?: string;
    eventTitle?: string;
  };
}

export const sendNotification = async (notificationData: NotificationData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: notificationData,
    });

    if (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }

    console.log('Notification sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Convenience functions for common notification types

export const sendMedicalAlert = async (
  recipients: string[],
  playerName: string,
  alertMessage: string,
  urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
  return sendNotification({
    to: recipients,
    subject: `🚨 Medical Alert - ${playerName}`,
    message: alertMessage,
    type: 'medical_alert',
    urgency,
    data: { playerName }
  });
};

export const sendAppointmentReminder = async (
  recipient: string,
  playerName: string,
  appointmentDate: string,
  details: string
) => {
  return sendNotification({
    to: recipient,
    subject: `📅 Appointment Reminder - ${playerName}`,
    message: details,
    type: 'appointment_reminder',
    data: { playerName, appointmentDate }
  });
};

export const sendScheduleUpdate = async (
  recipients: string[],
  eventTitle: string,
  updateMessage: string
) => {
  return sendNotification({
    to: recipients,
    subject: `📋 Schedule Update - ${eventTitle}`,
    message: updateMessage,
    type: 'schedule_update',
    data: { eventTitle }
  });
};

export const sendWelcomeEmail = async (
  recipient: string,
  userName: string
) => {
  return sendNotification({
    to: recipient,
    subject: '🏀 Welcome to Panthers Court!',
    message: `Hello ${userName},\n\nWelcome to the Panthers Court basketball management system! You can now access your dashboard, view schedules, and stay connected with your team.\n\nIf you have any questions, please don't hesitate to reach out to your coach or team administrator.`,
    type: 'welcome'
  });
};