"use client";

import * as React from "react";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFacetedRowModel,
  getFacetedUniqueValues,
  Row,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";
import { SelectAgent } from "@/lib/schema";

// Create a type that combines SelectAgent with our additional properties
type RowData = SelectAgent & {
  currentStep: number;
  totalSteps: number;
};

const columns = [
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }: { row: Row<RowData> }) => {
      // Default to 0/1 steps if not provided
      const currentStep = row.original.currentStep || 0;
      const totalSteps = row.original.totalSteps || 1;
      const progress = (currentStep / totalSteps) * 100;
      
      return (
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-neutral-400">
            {currentStep}/{totalSteps} Steps
          </span>
          <span className="text-xs text-neutral-500">
            {progress.toFixed(0)}%
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Onboard Name",
    cell: ({ row }: { row: Row<RowData> }) => (
      <span className="text-sm text-white hover:text-white/80 transition-colors">
        {row.original.name || "Untitled"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }: { row: Row<RowData> }) => {
      const date = row.original.createdAt;
      return (
        <span className="text-sm text-neutral-400">
          {date instanceof Date 
            ? date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })
            : "Unknown date"
          }
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Options",
    cell: () => (
      <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
        <MoreHorizontal className="w-4 h-4 text-neutral-400" />
      </button>
    ),
  },
];

interface DataTableProps {
  data: SelectAgent[];
}

export function AgentsDataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Transform the data to include the required properties
  const transformedData: RowData[] = data.map(agent => ({
    ...agent,
    currentStep: 0, // You should get these values from your actual data
    totalSteps: 1,  // You should get these values from your actual data
  }));

  const table = useReactTable({
    data: transformedData,
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <input
          placeholder="Search agents..."
          className="w-full max-w-xs px-4 py-2 bg-neutral-900/50 border border-white/[0.02] rounded-lg 
            text-sm text-neutral-300 placeholder:text-neutral-600
            focus:outline-none focus:ring-1 focus:ring-white/[0.05]"
        />
        <button className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 
          text-emerald-400 text-sm font-medium rounded-lg transition-colors">
          + Create Onboard
        </button>
      </div>
      
      {/* Table Container */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left border-b border-white/[0.02]"
                  >
                    <div className="text-sm font-medium text-neutral-400">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          
          {/* Body */}
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, i) => (
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  key={row.id}
                  className="group hover:bg-white/[0.02] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 border-t border-white/[0.02]"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-neutral-400"
                >
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <span>Rows per page</span>
          <select className="bg-transparent border border-white/[0.02] rounded-lg px-2 py-1">
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-400">
          <span>Page 1 of 1</span>
          <div className="flex gap-1">
            <button className="p-1 hover:bg-white/5 rounded" disabled>⟪</button>
            <button className="p-1 hover:bg-white/5 rounded" disabled>⟨</button>
            <button className="p-1 hover:bg-white/5 rounded" disabled>⟩</button>
            <button className="p-1 hover:bg-white/5 rounded" disabled>⟫</button>
          </div>
        </div>
      </div>
    </div>
  );
}