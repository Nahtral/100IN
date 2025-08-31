import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { ChatLayout } from '@/components/chat/ChatLayout';

const Chat: React.FC = () => {
  return (
    <Layout>
      <div className="h-full">
        <ChatLayout />
      </div>
    </Layout>
  );
};

export default Chat;