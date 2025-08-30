import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, Archive, RotateCcw, Trash2, Eye } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: Array<{
    role: string;
    is_active: boolean;
  }>;
  permissions: Array<{
    permission_name: string;
    permission_description: string;
    source: string;
  }>;
}

interface UserActionsDropdownProps {
  user: UserProfile;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}

const UserActionsDropdown = ({
  user,
  onArchive,
  onReactivate,
  onDelete,
  onViewDetails,
}: UserActionsDropdownProps) => {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  const handleArchive = () => {
    if (archiveReason.trim()) {
      onArchive();
      setShowArchiveDialog(false);
      setArchiveReason('');
    }
  };

  const handleDelete = () => {
    if (deleteReason.trim()) {
      onDelete();
      setShowDeleteDialog(false);
      setDeleteReason('');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
            <Archive className="w-4 h-4 mr-2" />
            Archive User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onReactivate}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reactivate User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Archive Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive User</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user account and revoke all access. The user can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="archive-reason">Reason for archiving</Label>
              <Textarea
                id="archive-reason"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Please provide a reason for archiving this user..."
                className="mt-1"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchive}
              disabled={!archiveReason.trim()}
            >
              Archive User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="delete-reason">Reason for deletion</Label>
              <Textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Please provide a reason for deleting this user..."
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Confirm by typing the user's email</Label>
              <Input
                id="confirm-email"
                placeholder={user.email}
                className="mt-1"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={!deleteReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserActionsDropdown;