import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SelectAgent } from "@/lib/schema";
import { DataTableColumnHeader } from "@/components/data-table/header";
import OptionsDropdown from "./options-dropdown";
import { cn } from "@/lib/utils";
import { MessageCircle, Share2, User } from "lucide-react";

export const columns: ColumnDef<SelectAgent>[] = [
  {
    accessorKey: "progress",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Progress" 
        className="min-w-[300px]"
      />
    ),
    cell: ({ row }) => {
      // Calculate progress
      const steps = row.original.settings?.steps || [];
      const completedSteps = steps.filter(step => step.completed).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      // Get configuration
      const isExternal = row.original.settings.onboardingType === "external";
      const isOneToMany = row.original.settings.allowMultipleSessions;
      const sessionCount = row.original._count?.sessions || 0;

      return (
        <div className="flex items-center gap-4">
          {/* Progress/Sessions Section */}
          <div className="flex items-center gap-2 min-w-[140px]">
            {!isOneToMany ? (
              <>
                <div className="w-32 h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      progress === 100 ? "bg-green-500" : "bg-white"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-400 whitespace-nowrap">
                  {completedSteps}/{totalSteps} Steps {Math.round(progress)}%
                </span>
              </>
            ) : (
              <span className="text-xs px-2 py-1 rounded-lg bg-dream-blue/20 text-dream-blue border border-dream-blue/20 flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {sessionCount} Sessions
              </span>
            )}
          </div>

          {/* Type Badges */}
          <div className="flex gap-2">
            <span className={cn(
              "px-2 py-1 rounded-lg text-xs border border-white/10 flex items-center gap-1",
              isExternal 
                ? "bg-dream-purple/20 text-dream-purple border-dream-purple/20"
                : "bg-dream-pink/20 text-dream-pink border-dream-pink/20"
            )}>
              <Share2 className="h-3 w-3" />
              {isExternal ? "External" : "Internal"}
            </span>

            <span className={cn(
              "px-2 py-1 rounded-lg text-xs border border-white/10 flex items-center gap-1",
              isOneToMany
                ? "bg-dream-orange/20 text-dream-orange border-dream-orange/20"
                : "bg-dream-cyan/20 text-dream-cyan border-dream-cyan/20"
            )}>
              <User className="h-3 w-3" />
              {isOneToMany ? "One-to-Many" : "One-to-One"}
            </span>
          </div>
        </div>
      );
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
  },
  {
    id: "actions",
    header: "Options",
    cell: ({ row }) => (
      <OptionsDropdown id={row.original.id} />
    ),
  },
];