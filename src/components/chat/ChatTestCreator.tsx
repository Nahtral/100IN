import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ChatTestCreator: React.FC = () => {
  const [creating, setCreating] = useState(false);

  const createTestData = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return;
      }

      // Create test chat directly using the edge function
      const { data, error } = await supabase.functions.invoke('chat-relay', {
        body: {
          action: 'create_chat',
          name: 'Test Chat',
          type: 'group',
          participants: [user.id]
        }
      });

      if (error) {
        console.error('Test chat creation error:', error);
        toast.error(`Failed to create test chat: ${error.message}`);
        return;
      }

      if (!data.success) {
        console.error('Test chat creation failed:', data.error);
        toast.error(`Failed to create test chat: ${data.error}`);
        return;
      }

      console.log('Test chat created:', data.data);
      toast.success('Test chat created successfully!');
      
      // Refresh the page to show the new chat
      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      console.error('Error creating test chat:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Chat System Test</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create a test chat to verify the chat system is working correctly.
      </p>
      <Button 
        onClick={createTestData} 
        disabled={creating}
        className="w-full"
      >
        {creating ? 'Creating Test Chat...' : 'Create Test Chat'}
      </Button>
    </Card>
  );
};