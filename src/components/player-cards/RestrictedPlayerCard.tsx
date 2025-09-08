import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Shield } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface Player {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
    email?: string;
  } | null;
}

interface RestrictedPlayerCardProps {
  player: Player;
  onViewDetails: (player: Player) => void;
}

export const RestrictedPlayerCard: React.FC<RestrictedPlayerCardProps> = ({
  player,
  onViewDetails
}) => {
  const { primaryRole, isSuperAdmin } = useOptimizedAuth();
  
  const isPlayerRole = primaryRole === 'player' && !isSuperAdmin();
  const canManagePlayer = isSuperAdmin() || primaryRole === 'staff' || primaryRole === 'coach';

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails(player)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {player.profiles?.full_name || 'Player'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {player.jersey_number && (
                  <Badge variant="outline" className="text-xs">
                    #{player.jersey_number}
                  </Badge>
                )}
                {player.position && (
                  <Badge variant="secondary" className="text-xs">
                    {player.position}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Status indicator - visible to all */}
          <Badge variant={player.is_active ? "default" : "secondary"} className="text-xs">
            {player.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Limited information for players */}
        {isPlayerRole ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Team member information
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(player);
              }}
            >
              View Details
            </Button>
          </div>
        ) : (
          /* Full information for authorized users */
          <div className="space-y-2">
            {canManagePlayer && player.profiles?.email && (
              <p className="text-xs text-muted-foreground">
                {player.profiles.email}
              </p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(player);
              }}
            >
              <Shield className="h-3 w-3 mr-1" />
              Manage Player
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};