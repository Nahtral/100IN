import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FiltersStatusProps {
  activeFilters: any;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

const FiltersStatus: React.FC<FiltersStatusProps> = ({
  activeFilters,
  onClearFilters,
  filteredCount,
  totalCount
}) => {
  const hasFilters = Object.keys(activeFilters).length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} events
        </span>
        {hasFilters && (
          <Badge variant="outline" className="ml-2">
            {Object.keys(activeFilters).length} filter{Object.keys(activeFilters).length > 1 ? 's' : ''} active
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="h-8 px-2"
      >
        <X className="h-4 w-4 mr-1" />
        Clear All
      </Button>
    </div>
  );
};

export default FiltersStatus;