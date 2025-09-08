import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock } from 'lucide-react';

interface PlayerRestrictedContentProps {
  children: React.ReactNode;
  allowPlayers?: boolean;
  requireRoles?: string[];
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export const PlayerRestrictedContent: React.FC<PlayerRestrictedContentProps> = ({
  children,
  allowPlayers = false,
  requireRoles = [],
  fallbackTitle = "Access Restricted",
  fallbackMessage = "You don't have permission to view this content."
}) => {
  const { primaryRole, isSuperAdmin, hasRole, loading } = useOptimizedAuth();
  
  const isPlayerRole = primaryRole === 'player' && !isSuperAdmin();

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  // Check if player role is allowed
  if (isPlayerRole && !allowPlayers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {fallbackTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {fallbackMessage}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check required roles
  if (requireRoles.length > 0) {
    const hasRequiredRole = isSuperAdmin() || requireRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {fallbackTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {fallbackMessage} Required roles: {requireRoles.join(', ')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }
  }

  return <>{children}</>;
};