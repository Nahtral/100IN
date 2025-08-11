import React from 'react';
import { cn } from '@/lib/utils';

interface MobileTableProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileTableRowProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileTableCellProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export const MobileTable = ({ children, className }: MobileTableProps) => {
  return (
    <div className={cn("mobile-table", className)}>
      <div className="hidden sm:table-header-group">
        {/* Table headers go here for desktop */}
      </div>
      <div className="block sm:table-row-group">
        {children}
      </div>
    </div>
  );
};

export const MobileTableRow = ({ children, className }: MobileTableRowProps) => {
  return (
    <div className={cn("mobile-table-row", className)}>
      {children}
    </div>
  );
};

export const MobileTableCell = ({ children, label, className }: MobileTableCellProps) => {
  return (
    <div className={cn("mobile-table-cell", className)}>
      {label && (
        <span className="font-medium text-muted-foreground text-sm block sm:hidden mb-1">
          {label}:
        </span>
      )}
      {children}
    </div>
  );
};