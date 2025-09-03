import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  Edit, 
  Copy, 
  Archive, 
  ArchiveRestore, 
  Trash2, 
  Image as ImageIcon,
  Users
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ScheduleEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  opponent?: string;
  description?: string;
  team_ids?: string[];
  created_by: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  status?: string | null;
  image_url?: string | null;
}

interface EventActionMenuProps {
  event: ScheduleEvent;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onAttendance: () => void;
  onImageUpload: () => void;
  isSuperAdmin: boolean;
  canManageAttendance: boolean;
}

const EventActionMenu: React.FC<EventActionMenuProps> = ({
  event,
  onEdit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onAttendance,
  onImageUpload,
  isSuperAdmin,
  canManageAttendance
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [confirmHardDelete, setConfirmHardDelete] = useState(false);

  const isArchived = event.status === 'archived';

  const handleDeleteClick = () => {
    if (deleteType === 'hard' && !confirmHardDelete) {
      return; // Don't proceed without confirmation for hard delete
    }
    onDelete();
    setShowDeleteDialog(false);
    setDeleteType('soft');
    setConfirmHardDelete(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-background border shadow-lg"
        >
          {isSuperAdmin && (
            <>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onImageUpload}>
                <ImageIcon className="h-4 w-4 mr-2" />
                {event.image_url ? 'Change Image' : 'Add Image'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {canManageAttendance && (
            <>
              <DropdownMenuItem onClick={onAttendance}>
                <Users className="h-4 w-4 mr-2" />
                Manage Attendance
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {isSuperAdmin && (
            <>
              {isArchived ? (
                <DropdownMenuItem onClick={onUnarchive}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Are you sure you want to delete "{event.title}"? 
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="soft-delete"
                      name="delete-type"
                      checked={deleteType === 'soft'}
                      onChange={() => setDeleteType('soft')}
                    />
                    <Label htmlFor="soft-delete" className="text-sm">
                      <strong>Soft delete</strong> - Hide event but keep data (recommended)
                    </Label>
                  </div>
                  
                  {isSuperAdmin && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="hard-delete"
                          name="delete-type"
                          checked={deleteType === 'hard'}
                          onChange={() => setDeleteType('hard')}
                        />
                        <Label htmlFor="hard-delete" className="text-sm">
                          <strong>Permanent delete</strong> - Remove completely (cannot be undone)
                        </Label>
                      </div>
                      
                      {deleteType === 'hard' && (
                        <div className="ml-6 flex items-center space-x-2">
                          <Checkbox
                            id="confirm-hard-delete"
                            checked={confirmHardDelete}
                            onCheckedChange={(checked) => setConfirmHardDelete(checked === true)}
                          />
                          <Label htmlFor="confirm-hard-delete" className="text-sm text-destructive">
                            I understand this cannot be undone
                          </Label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteType('soft');
              setConfirmHardDelete(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClick}
              disabled={deleteType === 'hard' && !confirmHardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteType === 'hard' ? 'Delete Permanently' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EventActionMenu;