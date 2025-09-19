import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Minus, Plus } from 'lucide-react';
import { MembershipSummary } from '@/hooks/useMembership';
import { MembershipSummaryV2 } from '@/hooks/useMembershipV2';

interface AdjustUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  membershipSummary: MembershipSummary | MembershipSummaryV2;
  onAdjust: (delta: number, reason: string) => Promise<boolean>;
  loading: boolean;
}

export const AdjustUsageModal: React.FC<AdjustUsageModalProps> = ({
  isOpen,
  onClose,
  membershipSummary,
  onAdjust,
  loading
}) => {
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || delta === 0) return;
    
    const success = await onAdjust(delta, reason.trim());
    if (success) {
      setDelta(0);
      setReason('');
      onClose();
    }
  };

  const handleQuickAdjust = async (quickDelta: number) => {
    if (!reason.trim()) return;
    
    const success = await onAdjust(quickDelta, reason.trim());
    if (success) {
      setDelta(0);
      setReason('');
      onClose();
    }
  };

  const newUsedClasses = (membershipSummary.used_classes || 0) + delta;
  const newRemainingClasses = membershipSummary.remaining_classes !== null 
    ? (membershipSummary.remaining_classes - delta)
    : null;

  const isValid = reason.trim() && delta !== 0 && 
    (membershipSummary.allocation_type !== 'CLASS_COUNT' || newUsedClasses >= 0);

  const wouldGoNegative = membershipSummary.allocation_type === 'CLASS_COUNT' && 
    newRemainingClasses !== null && newRemainingClasses < 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Class Usage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Status */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Membership Type:</span>
                  <span className="font-medium">
                    {('type' in membershipSummary) ? membershipSummary.type : membershipSummary.membership_type_name}
                  </span>
                </div>
                {membershipSummary.allocation_type === 'CLASS_COUNT' && (
                  <>
                    <div className="flex justify-between">
                      <span>Used Classes:</span>
                      <span className="font-medium">{membershipSummary.used_classes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining Classes:</span>
                      <span className="font-medium">{membershipSummary.remaining_classes}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Adjustment Input */}
          <div className="space-y-2">
            <Label htmlFor="delta">Adjustment</Label>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDelta(delta - 1)}
                disabled={loading}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="delta"
                type="number"
                value={delta}
                onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
                placeholder="0"
                min="-50"
                max="50"
                className="text-center"
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDelta(delta + 1)}
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Positive numbers add classes, negative numbers deduct classes
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Required)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this adjustment is needed..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Preview */}
          {delta !== 0 && membershipSummary.allocation_type === 'CLASS_COUNT' && (
            <Card className={wouldGoNegative ? 'border-destructive' : 'border-muted'}>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    {wouldGoNegative && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    <span className="font-medium">After Adjustment:</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used Classes:</span>
                    <span className={`font-medium ${newUsedClasses < 0 ? 'text-destructive' : ''}`}>
                      {membershipSummary.used_classes} → {newUsedClasses}
                    </span>
                  </div>
                  {newRemainingClasses !== null && (
                    <div className="flex justify-between">
                      <span>Remaining Classes:</span>
                      <span className={`font-medium ${newRemainingClasses < 0 ? 'text-destructive' : ''}`}>
                        {membershipSummary.remaining_classes} → {newRemainingClasses}
                      </span>
                    </div>
                  )}
                  {wouldGoNegative && (
                    <p className="text-xs text-destructive">
                      Warning: This adjustment would result in negative remaining classes
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between space-x-2">
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjust(-1)}
                disabled={loading || !reason.trim() || membershipSummary.used_classes === 0}
              >
                -1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjust(1)}
                disabled={loading || !reason.trim()}
              >
                +1
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || loading}
              >
                {loading ? 'Adjusting...' : 'Apply Adjustment'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};