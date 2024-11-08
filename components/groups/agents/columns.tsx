"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SelectAgent, Step } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table/header";
import OptionsDropdown from "./options-dropdown";
import { cn } from "@/lib/utils";

export const columns: ColumnDef<SelectAgent>[] = [
  {
    accessorKey: "progress",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Progress" 
        className="min-w-[200px]"
      />
    ),
    cell: ({ row }) => {
      // Calculate progress from agent settings
      const steps = row.original.settings?.steps || [];
      const completedSteps = steps.filter(step => step.completed).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      return (
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress === 100 ? "bg-green-500" : "bg-white"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-neutral-400">
            {completedSteps}/{totalSteps} Steps
          </span>
          <span className="text-xs text-neutral-500">
            {Math.round(progress)}%
          </span>
        </div>
      );
    },
    filterFn: (row, id, filterValue) => {
      const steps = row.original.settings?.steps || [];
      const completedSteps = steps.filter(step => step.completed).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      // Allow filtering by percentage ranges (e.g., "0-25", "25-50", "50-75", "75-100")
      const [min, max] = filterValue.split("-").map(Number);
      return progress >= min && progress <= max;
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Onboard Name" />
    ),
    cell: ({ row }) => {
      const name = row.original.name || "Untitled";
      return (
        <Link
          href={`/agents/${row.original.id}`}
          className="text-sm text-white hover:text-white/80 transition-colors"
        >
          {name}
        </Link>
      );
    },
    filterFn: (row, id, value) => {
      const name = row.original.name || "Untitled";
      return name.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Created" />
    ),
    cell: ({ row }) => {
      return (
        <span className="text-sm text-neutral-400">
          {row.original.createdAt instanceof Date 
            ? row.original.createdAt.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })
            : new Date(row.original.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })
          }
        </span>
      );
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      const date = row.original.createdAt;
      const dateStr = date instanceof Date 
        ? date.toISOString()
        : new Date(date).toISOString();
      
      // Support filtering by date ranges
      if (value.includes("to")) {
        const [start, end] = value.split(" to ");
        return dateStr >= start && dateStr <= end;
      }
      
      // Support filtering by specific dates
      return dateStr.startsWith(value);
    },
  },
  {
    id: "actions",
    header: "Options",
    cell: ({ row }) => (
      <OptionsDropdown id={row.original.id} />
    ),
  },
];