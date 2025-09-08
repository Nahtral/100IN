import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, Settings } from 'lucide-react';
import { TeamManagementModal } from './TeamManagementModal';

interface PlayerTeamAssignmentsProps {
  playerId: string;
  playerName: string;
  currentTeams?: Array<{
    id: string;
    team_name: string;
    role_on_team: string;
  }>;
  onUpdate?: () => void;
}

export const PlayerTeamAssignments: React.FC<PlayerTeamAssignmentsProps> = ({
  playerId,
  playerName,
  currentTeams = [],
  onUpdate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getRoleDisplayName = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'captain':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'co_captain':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'substitute':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Assignments
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage Teams
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currentTeams.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Not assigned to any teams</p>
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add to Team
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentTeams.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <span className="font-medium">{assignment.team_name}</span>
                  <Badge 
                    variant="outline" 
                    className={getRoleBadgeColor(assignment.role_on_team)}
                  >
                    {getRoleDisplayName(assignment.role_on_team)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TeamManagementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        playerId={playerId}
        playerName={playerName}
        onUpdate={onUpdate}
      />
    </>
  );
};

export default PlayerTeamAssignments;