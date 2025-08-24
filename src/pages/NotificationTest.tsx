import React from 'react';
import Layout from '@/components/layout/Layout';
import { NotificationDemo } from '@/components/notifications/NotificationDemo';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function NotificationTest() {
  const { currentUser } = useCurrentUser();

  return (
    <Layout currentUser={currentUser}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Notification System Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the notification system with various types of notifications.
          </p>
        </div>

        <NotificationDemo />
      </div>
    </Layout>
  );
}