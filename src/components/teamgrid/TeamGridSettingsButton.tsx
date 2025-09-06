import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface TeamGridSettingsButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TeamGridSettingsButton: React.FC<TeamGridSettingsButtonProps> = ({
  className = '',
  variant = 'outline',
  size = 'default'
}) => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useOptimizedAuth();

  // Don't show while loading or if not super admin
  if (loading || !isSuperAdmin()) {
    return null;
  }

  const handleClick = () => {
    navigate('/admin/teamgrid-settings');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`flex items-center gap-2 ${className}`}
    >
      <Settings className="h-4 w-4" />
      TeamGrid Settings
    </Button>
  );
};