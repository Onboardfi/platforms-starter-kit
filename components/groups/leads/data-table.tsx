
"use client";

import * as React from "react";
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";
import { columns } from "@/components/groups/sites/columns";
import { SelectSite } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps {
  data: SelectSite[];
  title?: string;
  description?: string;
  pageSize?: number;
}

export function DataTable({ 
  data,
  title,
  description,
  pageSize = 10,
}: DataTableProps) {
  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Simulate loading state
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="w-full">
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="space-y-4">
          <DataTableToolbar table={table} />
          <div className="rounded-md border">
            <ScrollArea className="h-[calc(100vh-350px)]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead 
                          key={header.id}
                          className="h-12"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder ? null : (
                            <div className={cn(
                              "flex items-center gap-2",
                              header.column.getCanSort() && "cursor-pointer select-none"
                            )}>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </div>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading state
                    Array.from({ length: pageSize }).map((_, index) => (
                      <TableRow key={index}>
                        {columns.map((column, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length ? (
                    // Data rows
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "transition-colors hover:bg-muted/50",
                          row.getIsSelected() && "bg-muted"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="py-3"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    // Empty state
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        <div className="flex flex-col items-center justify-center space-y-1 text-muted-foreground">
                          <p>No results found</p>
                          <p className="text-sm">
                            Try adjusting your filters or search terms
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DataTablePagination table={table} />
        </div>
      </CardContent>
    </Card>
  );
}

// Default export for easier imports
export default DataTable;
