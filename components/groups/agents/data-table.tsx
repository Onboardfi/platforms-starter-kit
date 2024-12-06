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
} from "@tanstack/react-table";
import { SelectAgent } from "@/lib/schema";
import { ArrowUp, ArrowDown, Search, MoreHorizontal, MessageCircle, Share2, User } from "lucide-react";
import { columns } from "./columns";
import { cn } from "@/lib/utils";

interface DataTableProps {
  data: SelectAgent[];
}

// Dream UI Table Header Component
const DreamTableHeader = ({ children }: { children: React.ReactNode }) => (
  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-300 first:pl-8 last:pr-8">
    {children}
  </th>
);

// Dream UI Table Cell Component
const DreamTableCell = ({ children }: { children: React.ReactNode }) => (
  <td className="px-6 py-4 text-sm text-neutral-300 first:pl-8 last:pr-8">
    {children}
  </td>
);

// Dream UI Search Component
const DreamSearch = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search agents..."
      className="h-10 w-[250px] rounded-xl bg-neutral-900/50 pl-9 pr-4 text-sm text-neutral-300 placeholder:text-neutral-500 border border-white/[0.08] focus:border-dream-purple/50 focus:ring-dream-purple/20 transition-all duration-300 backdrop-blur-md"
    />
  </div>
);

// Dream UI Toolbar Component
const DreamToolbar = ({ table }: { table: any }) => {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between p-1">
      <DreamSearch
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(value) => table.getColumn("name")?.setFilterValue(value)}
      />
      <div className="flex items-center gap-2">
        {isFiltered && (
          <button
            onClick={() => table.resetColumnFilters()}
            className="px-3 py-1.5 rounded-xl bg-neutral-900/50 text-neutral-300 text-sm hover:bg-neutral-800/50 transition-colors duration-300 shine"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};

// Dream UI Pagination Component
const DreamPagination = ({ table }: { table: any }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <span>·</span>
        <span>{table.getFilteredRowModel().rows.length} row(s)</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-1.5 rounded-xl bg-neutral-900/50 text-neutral-300 text-sm hover:bg-neutral-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 shine"
        >
          Previous
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="px-3 py-1.5 rounded-xl bg-neutral-900/50 text-neutral-300 text-sm hover:bg-neutral-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 shine"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export function AgentsDataTable({ data }: DataTableProps) {
  // Debug logging for initial data
  React.useEffect(() => {
    console.group('AgentsDataTable - Initial Data Debug');
    console.log('Raw data:', data);
    data.forEach(agent => {
      console.log(`Agent: ${agent.name} (${agent.id})`);
      console.log('- Session count:', agent._count?.sessions);
      console.log('- Settings:', agent.settings);
      console.log('- Full _count object:', agent._count);
    });
    console.groupEnd();
  }, [data]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Validate data structure
  if (!Array.isArray(data)) {
    console.error('Invalid data format:', data);
    return <div>Error: Data must be an array</div>;
  }

  // Check for missing _count property
  const missingCounts = data.filter(agent => !agent._count);
  if (missingCounts.length > 0) {
    console.warn('Agents missing _count property:', missingCounts);
  }

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Debug logging for table rows
  React.useEffect(() => {
    console.group('AgentsDataTable - Table Rows Debug');
    table.getRowModel().rows.forEach(row => {
      console.log(`Row ${row.id}:`);
      console.log('- Original data:', row.original);
      console.log('- Session count:', row.original._count?.sessions);
      console.log('- Is one-to-many:', row.original.settings?.allowMultipleSessions);
    });
    console.groupEnd();
  }, [table.getRowModel().rows]);

  return (
    <div className="space-y-4">
      <DreamToolbar table={table} />

      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/[0.08] bg-neutral-900/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <DreamTableHeader key={header.id}>
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanSort() && (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              "ml-auto h-4 w-4 transition-colors duration-300",
                              header.column.getIsSorted()
                                ? "text-dream-purple"
                                : "text-neutral-500 hover:text-neutral-300"
                            )}
                          >
                            {header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <MoreHorizontal className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </DreamTableHeader>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group hover:bg-white/[0.02] transition-colors duration-300"
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <DreamTableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </DreamTableCell>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-neutral-500"
                  >
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-neutral-900/30 backdrop-blur-md">
        <DreamPagination table={table} />
      </div>
    </div>
  );
}