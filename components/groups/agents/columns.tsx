///Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/groups/agents/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SelectAgent } from "@/lib/schema";
import { DataTableColumnHeader } from "@/components/data-table/header";
import OptionsDropdown from "./options-dropdown";
import { cn } from "@/lib/utils";
import { MessageCircle, Share2, User } from "lucide-react";
import Image from "next/image"; // Add this import
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
      const agent = row.original;
      
      // Progress calculation
      const steps = agent.settings?.steps || [];
      const completedSteps = steps.filter(step => step.completed).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      // Configuration
      const isExternal = agent.settings?.onboardingType === "external";
      const isOneToMany = agent.settings?.allowMultipleSessions ?? false;
      const sessionCount = agent._count?.sessions ?? 0;

      return (
        <div className="flex items-center gap-4">
          {/* Progress/Sessions Section */}
          <div className="flex items-center gap-2 min-w-[140px]">
            {!isOneToMany && totalSteps > 0 ? (
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
                {sessionCount.toLocaleString()} Sessions
              </span>
            )}
          </div>

          {/* Type Badges */}
          <div className="flex gap-2">
            {/* Agent Type Badge */}
            <span className={cn(
              "px-2 py-1 rounded-lg text-xs border border-white/10 flex items-center gap-1",
              isExternal 
                ? "bg-dream-purple/20 text-dream-purple border-dream-purple/20"
                : "bg-dream-pink/20 text-dream-pink border-dream-pink/20"
            )}>
              <Share2 className="h-3 w-3" />
              {isExternal ? "External" : "Internal"}
            </span>

            {/* Session Type Badge */}
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
    accessorKey: "creator",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const creator = row.original.creator;
      return (
        <div className="flex items-center gap-2">
          {creator.image ? (
            <div className="relative h-6 w-6 rounded-full overflow-hidden border border-white/10">
              <Image
                src={creator.image}
                alt={creator.name || 'Creator'}
                width={24}
                height={24}
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full bg-neutral-800 flex items-center justify-center">
              <span className="text-xs text-neutral-400">
                {(creator.name || 'U').charAt(0)}
              </span>
            </div>
          )}
          <span className="text-sm text-neutral-400">
            {creator.name || 'Unknown'}
          </span>
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
      const date = row.original.createdAt instanceof Date 
        ? row.original.createdAt 
        : new Date(row.original.createdAt);

      return (
        <span className="text-sm text-neutral-400">
          {date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Updated" />
    ),
    cell: ({ row }) => {
      const date = row.original.updatedAt instanceof Date 
        ? row.original.updatedAt 
        : new Date(row.original.updatedAt);

      return (
        <span className="text-sm text-neutral-400">
          {date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          })}
        </span>
      );
    },
  }
];