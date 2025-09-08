import React, { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayerFormModal } from './PlayerFormModal';
import PlayerDetailsModal from '@/components/player-details/PlayerDetailsModal';

interface Player {
  id: string;
  user_id: string;
  team_id?: string;
  jersey_number?: number;
  position?: string;
  height?: string;
  weight?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  is_active: boolean;
  total_shots?: number;
  total_makes?: number;
  shooting_percentage?: number;
  avg_arc_degrees?: number;
  avg_depth_inches?: number;
  last_session_date?: string;
  total_sessions?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email?: string;
    phone?: string;
  } | null;
  teams?: {
    name: string;
    season?: string;
  };
}

interface PlayerCardProps {
  player: Player;
  onUpdate: () => void;
  onDelete: (playerId: string) => void;
  currentUser: any;
  userId?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onUpdate, 
  onDelete, 
  currentUser, 
  userId 
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canEdit = isSuperAdmin || currentUser?.role === 'staff' || currentUser?.role === 'coach';
  const canDelete = isSuperAdmin;
  const canViewSensitiveData = isSuperAdmin || player.user_id === userId;

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    onUpdate();
  };

  return (
    <>
      <div 
        className="mobile-list-item cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsDetailsOpen(true)}
      >
        <div className="mobile-list-header">
          <div className="flex items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <h3 className="mobile-text font-semibold text-foreground">
                {player.profiles?.full_name || 'N/A'}
              </h3>
              <div className="flex items-center gap-2">
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
          
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditOpen(true);
                  }}
                  className="touch-target"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(player.id);
                  }}
                  className="touch-target"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="mobile-list-content">
          {/* Email (only for authorized users) */}
          {canViewSensitiveData && player.profiles?.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="mobile-text-sm">{player.profiles.email}</span>
            </div>
          )}
          
          {/* Physical stats */}
          {(player.height || player.weight) && (
            <div className="flex items-center gap-4 mobile-text-sm">
              {player.height && <span>Height: {player.height}</span>}
              {player.weight && <span>Weight: {player.weight}</span>}
            </div>
          )}
          
          {/* ShotIQ Stats */}
          {player.total_shots && player.total_shots > 0 ? (
            <div className="flex flex-wrap items-center gap-2 mobile-text-sm">
              <Badge variant="outline" className="text-xs">
                {player.shooting_percentage?.toFixed(1)}% shooting
              </Badge>
              <span className="text-muted-foreground">
                {player.total_makes}/{player.total_shots} shots
              </span>
              <span className="text-muted-foreground">
                {player.total_sessions} sessions
              </span>
            </div>
          ) : (
            <span className="mobile-text-sm text-muted-foreground">No ShotIQ data yet</span>
          )}
          
          {/* Emergency contact (only for authorized users) */}
          {canViewSensitiveData && (player.emergency_contact_name || player.emergency_contact_phone) && (
            <div className="mobile-text-sm text-muted-foreground">
              <span>Emergency: </span>
              {player.emergency_contact_name && <span>{player.emergency_contact_name}</span>}
              {player.emergency_contact_phone && <span> • {player.emergency_contact_phone}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <PlayerFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
        editingPlayer={player}
      />

      {/* Details Modal */}
      <PlayerDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        player={player}
        onUpdate={onUpdate}
      />
    </>
  );
};