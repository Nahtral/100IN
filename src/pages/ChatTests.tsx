import React from 'react';
import Layout from '@/components/layout/Layout';
import { ChatTests as ChatTestsComponent } from '@/components/chat/ChatTests';

const ChatTests: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Chat System Tests</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive test suite for the production-ready chat system. 
            All tests must pass before deployment.
          </p>
        </div>
        
        <ChatTestsComponent />
        
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Test Coverage</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✅ Database schema validation</li>
            <li>✅ RPC functions availability</li>
            <li>✅ Row Level Security policies</li>
            <li>✅ Chat creation (1:1 and group)</li>
            <li>✅ Message sending/receiving</li>
            <li>✅ Pagination functionality</li>
            <li>✅ Permission verification</li>
            <li>✅ Realtime updates</li>
            <li>✅ Performance requirements (p95 &lt; 400ms)</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default ChatTests;