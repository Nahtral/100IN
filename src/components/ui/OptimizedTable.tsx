import React, { useMemo } from 'react';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => any);
  cell?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

interface OptimizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (item: T) => string;
  rowHeight?: number;
  maxHeight?: number;
  className?: string;
}

export function OptimizedTable<T>({
  data,
  columns,
  getRowKey,
  rowHeight = 60,
  maxHeight = 600,
  className
}: OptimizedTableProps<T>) {
  const { visibleItems, totalHeight, handleScroll } = useVirtualScroll(data, {
    itemHeight: rowHeight,
    containerHeight: maxHeight,
    overscan: 5
  });

  const renderCell = (column: Column<T>, item: T) => {
    const value = typeof column.accessor === 'function' 
      ? column.accessor(item) 
      : item[column.accessor];
    
    return column.cell ? column.cell(value, item) : value;
  };

  return (
    <div 
      className={`relative overflow-auto ${className}`}
      style={{ maxHeight }}
      onScroll={handleScroll}
    >
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            {columns.map((column, index) => (
              <TableHead 
                key={index} 
                style={{ width: column.width }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: totalHeight }}>
            <td colSpan={columns.length} style={{ padding: 0, border: 'none' }}>
              <div className="relative">
                {visibleItems.map(({ item, index, style }) => (
                  <TableRow
                    key={getRowKey(item)}
                    style={style}
                    className="absolute left-0 right-0"
                  >
                    {columns.map((column, colIndex) => (
                      <TableCell 
                        key={colIndex}
                        style={{ width: column.width }}
                      >
                        {renderCell(column, item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </div>
            </td>
          </tr>
        </TableBody>
      </Table>
    </div>
  );
}