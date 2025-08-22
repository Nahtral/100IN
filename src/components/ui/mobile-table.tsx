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
    <div className={cn("mobile-table overflow-auto", className)}>
      <div className="hidden lg:table-header-group">
        {/* Table headers go here for desktop */}
      </div>
      <div className="block lg:table-row-group mobile-list">
        {children}
      </div>
    </div>
  );
};

export const MobileTableRow = ({ children, className }: MobileTableRowProps) => {
  return (
    <div className={cn("mobile-list-item lg:table-row", className)}>
      {children}
    </div>
  );
};

export const MobileTableCell = ({ children, label, className }: MobileTableCellProps) => {
  return (
    <div className={cn("lg:table-cell", className)}>
      {label && (
        <span className="font-medium text-muted-foreground mobile-text-sm block lg:hidden mb-2">
          {label}:
        </span>
      )}
      <div className="mobile-text">
        {children}
      </div>
    </div>
  );
};