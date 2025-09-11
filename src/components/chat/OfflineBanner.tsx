import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <Alert variant="destructive" className="m-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        You appear to be offline. Some features may not work until your connection is restored.
      </AlertDescription>
    </Alert>
  );
};