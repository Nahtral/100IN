import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayersList } from '@/components/players/PlayersList';
import { PlayerFormModal } from '@/components/players/PlayerFormModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/contexts/AuthContext';

const PlayersManagement = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { currentUser } = useCurrentUser();
  const { user } = useAuth();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canAddPlayers = isSuperAdmin || currentUser?.role === 'staff' || currentUser?.role === 'coach';

  const handlePlayerAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setIsFormOpen(false);
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="mobile-space-y">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mobile-gap">
          <div className="text-center sm:text-left">
            <h1 className="mobile-title text-foreground">Players</h1>
            <p className="mobile-text text-muted-foreground">Manage your team roster</p>
          </div>
          
          {canAddPlayers && (
            <Button onClick={() => setIsFormOpen(true)} size="lg" className="w-full sm:w-auto">
              <Plus className="h-5 w-5 mr-2" />
              Add Player
            </Button>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlayersList refreshTrigger={refreshTrigger} userId={user?.id} />
          </CardContent>
        </Card>

        <PlayerFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handlePlayerAdded}
        />
      </div>
    </Layout>
  );
};

export default PlayersManagement;