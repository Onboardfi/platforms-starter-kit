// components/groups/agents/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SelectAgent, Step } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table/header";
import OptionsDropdown from "./options-dropdown";
import { Progress } from "@/components/ui/progress"; // Import your ProgressBar component

export const columns: ColumnDef<SelectAgent>[] = [
  // Replace the 'id' column with the 'progress' column
  {
    accessorKey: "progress",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Progress" />
    ),
    cell: ({ row }) => {
      // Access the agent's settings and steps
      const settings = row.original.settings;
      const steps: Step[] = settings?.steps || [];
      const totalSteps = steps.length;
      const completedSteps = steps.filter((step) => step.completed).length;
      const completionPercentage =
        totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

      // Ensure completion percentage is within 0-100
      const clampedValue = Math.min(Math.max(completionPercentage, 0), 100);

      // Render the progress bar
      return (
        <div className="flex flex-col w-40">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-medium">
              {completedSteps} / {totalSteps} Steps
            </p>
            <p className="text-xs text-gray-500">
              {clampedValue.toFixed(0)}%
            </p>
          </div>
          <Progress
            value={clampedValue}
            max={100}
          />
        </div>
      );
    },
  },
  // Other columns...
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Onboard Name" />
    ),
    cell: ({ row }) => {
      const name: string = row.getValue("name") || "Untitled";
      return (
        <Link
          className="underline underline-offset-4 hover:opacity-70 transition-all"
          href={`/agents/${row.original.id}`}
        >
          {name}
        </Link>
      );
    },
    filterFn: (row, id, value) => {
      const cellValue = row.getValue<string>(id) || "";
      return cellValue.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Created" />
    ),
    cell: ({ row }) => {
      const createdAt: Date = row.getValue("createdAt");
      return (
        <p className="text-xs">
          {createdAt.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          })}
        </p>
      );
    },
  },
  {
    id: "options",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Options" />
    ),
    cell: ({ row }) => {
      const id: string = row.original.id;
      return <OptionsDropdown id={id} />;
    },
    enableSorting: false,
  },
];
