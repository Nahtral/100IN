import React from 'react';
import Layout from '@/components/layout/Layout';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatTestButton } from '@/components/chat/ChatTestButton';

const Chat: React.FC = () => {
  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Test Button for Development */}
        <div className="p-4 border-b">
          <ChatTestButton />
        </div>
        
        {/* Main Chat Interface */}
        <div className="flex-1">
          <ChatLayout />
        </div>
      </div>
    </Layout>
  );
};

export default Chat;