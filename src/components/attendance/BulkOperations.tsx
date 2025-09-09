import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkOperationsProps {
  selectedPlayers: Set<string>;
  bulkStatus: 'present' | 'absent' | 'late' | 'excused';
  onBulkStatusChange: (status: 'present' | 'absent' | 'late' | 'excused') => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApplyBulkStatus: () => void;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedPlayers,
  bulkStatus,
  onBulkStatusChange,
  onSelectAll,
  onDeselectAll,
  onApplyBulkStatus
}) => {
  const { toast } = useToast();

  const handleApplyBulkStatus = () => {
    if (selectedPlayers.size === 0) {
      toast({
        title: "No Players Selected",
        description: "Please select players to apply bulk status.",
        variant: "destructive",
      });
      return;
    }
    onApplyBulkStatus();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Bulk Operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              Deselect All
            </Button>
          </div>
          
          <div className="flex gap-2 flex-1">
            <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="excused">Excused</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleApplyBulkStatus} disabled={selectedPlayers.size === 0}>
              Apply to Selected ({selectedPlayers.size})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};