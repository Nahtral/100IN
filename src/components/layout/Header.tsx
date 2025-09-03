
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import ProfilePicture from '@/components/ui/ProfilePicture';
import { EnhancedNotificationCenter } from '@/components/notifications/EnhancedNotificationCenter';

interface HeaderProps {
  currentUser?: {
    name: string;
    role: string;
    avatar: string;
  };
}

const Header = ({ currentUser }: HeaderProps) => {
  const { signOut } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const { userRole } = useUserRole();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    updateProfile({ avatar_url: newAvatarUrl });
  };

  const displayName = profile?.full_name || currentUser?.name || 'User';
  const displayRole = userRole || currentUser?.role || 'Loading...';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 ml-64">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <EnhancedNotificationCenter />
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <ProfilePicture
                avatarUrl={profile?.avatar_url}
                userName={displayName}
                onAvatarUpdate={handleAvatarUpdate}
              />
              <div>
                <p className="text-sm font-medium">{displayName}</p>
                <Badge variant="secondary" className="text-xs">
                  {displayRole}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
