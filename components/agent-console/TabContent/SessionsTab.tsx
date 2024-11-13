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
  Table,
  ColumnDef,
} from "@tanstack/react-table";
import { Session } from "@/lib/types";
import {
  Settings,
  Trash2,
  Plus,
  Inbox,
  Eye,
  Search,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react"; // Import all necessary icons
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "../shared/LoadingState";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { EditSessionModal } from "./EditSessionModal";
import SessionDetails from "./SessionDetails";

interface SessionsTabProps {
  sessions: Session[];
  isLoadingSessions: boolean;
  onSessionCreated?: () => Promise<void>;
  onSessionSelect?: (sessionId: string) => Promise<void>;
  agentId: string;
  currentSessionId: string | null;
  primaryColor: string;
  secondaryColor: string;
  allowMultipleSessions?: boolean;
  readonly?: boolean; // Indicates if the component is in readonly mode (Analytics page)
}

type RowData = Session & {
  progress: {
    completedSteps: number;
    totalSteps: number;
    percentage: number;
  };
};

export function SessionsTab({
  sessions: initialSessions,
  isLoadingSessions,
  onSessionCreated,
  onSessionSelect,
  agentId,
  currentSessionId,
  primaryColor,
  secondaryColor,
  allowMultipleSessions = true,
  readonly = false, // Default to false for Agent page
}: SessionsTabProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isCreating, setIsCreating] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<Session | null>(
    null
  );
  const [sessions, setSessions] = React.useState<Session[]>(initialSessions);
  const [isDeletingSession, setIsDeletingSession] = React.useState<
    string | null
  >(null);
  const [editingSession, setEditingSession] = React.useState<Session | null>(
    null
  );
  const [isEditingSession, setIsEditingSession] = React.useState(false);

  React.useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Transform session data to include progress information
  const processSessionData = (session: Session): RowData => {
    const steps = session.stepProgress?.steps || [];
    const completedSteps = steps.filter((step) => step.completed).length;
    const totalSteps = steps.length || 1; // Avoid division by zero
    const percentage = Math.round((completedSteps / totalSteps) * 100);

    return {
      ...session,
      progress: {
        completedSteps,
        totalSteps,
        percentage,
      },
    };
  };

  const transformedData: RowData[] = React.useMemo(
    () => sessions.map(processSessionData),
    [sessions]
  );

  // Define columns
  const columns: ColumnDef<RowData>[] = [
    {
      accessorKey: "name",
      header: "Session Name",
      cell: ({ row }: { row: Row<RowData> }) => (
        <div className="flex flex-col">
          <span className="text-sm text-white hover:text-white/80 transition-colors font-mono">
            {row.original.name || "Untitled"}
          </span>
          {row.original.type && (
            <span className="text-xs text-neutral-400">{row.original.type}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: ({ row }: { row: Row<RowData> }) => {
        const { completedSteps, totalSteps, percentage } = row.original.progress;

        return (
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-300", {
                  "bg-green-500": percentage === 100,
                  "bg-yellow-500": percentage > 0 && percentage < 100,
                  "bg-white/20": percentage === 0,
                })}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-neutral-400">
              {completedSteps}/{totalSteps} Steps
            </span>
            <span className="text-xs text-neutral-500">{percentage}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date Created",
      cell: ({ row }: { row: Row<RowData> }) => {
        const date = new Date(row.original.createdAt);
        return (
          <span className="text-sm text-neutral-400">
            {date instanceof Date
              ? date.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })
              : "Unknown date"}
          </span>
        );
      },
    },
    {
      accessorKey: "lastInteractionAt",
      header: "Last Active",
      cell: ({ row }: { row: Row<RowData> }) => {
        const date = row.original.lastInteractionAt
          ? new Date(row.original.lastInteractionAt)
          : null;
        return (
          <span className="text-sm text-neutral-400">
            {date
              ? date.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })
              : "Never"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end space-x-2">
          {/* View Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 rounded-full",
              "hover:bg-white/5",
              "transition-all duration-300"
            )}
            onClick={() => handleViewSession(row.original)}
            aria-label="View Session"
          >
            <Eye className="h-4 w-4 text-white/70" />
          </Button>

          {/* Edit Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 rounded-full",
              "hover:bg-white/5",
              "transition-all duration-300"
            )}
            onClick={() => setEditingSession(row.original)}
            disabled={readonly}
            aria-label="Edit Session"
          >
            <Settings className="h-4 w-4 text-white/70" />
          </Button>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 rounded-full",
              "hover:bg-pink-500/10 hover:text-pink-500",
              "transition-all duration-300",
              isDeletingSession === row.original.id &&
                "opacity-50 cursor-not-allowed"
            )}
            disabled={
              row.original.id === currentSessionId ||
              isDeletingSession === row.original.id ||
              readonly
            }
            onClick={() => handleDeleteSession(row.original)}
            aria-label="Delete Session"
          >
            {isDeletingSession === row.original.id ? (
              <LoadingState />
            ) : (
              <Trash2
                className={cn(
                  "h-4 w-4",
                  row.original.id === currentSessionId
                    ? "text-white/20"
                    : "text-white/70"
                )}
              />
            )}
          </Button>
        </div>
      ),
    },
  ];

  // Table setup
  const table = useReactTable<RowData>({
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

  // Helper functions
  const getTimeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
  };

  // Action handlers
  const handleEditSession = async (name: string) => {
    if (!editingSession) return;

    try {
      setIsEditingSession(true);
      const response = await apiClient.patch(
        "/api/updateSession",
        {
          sessionId: editingSession.id,
          name,
        },
        {
          headers: {
            "x-agent-id": agentId,
          },
        }
      );

      if (response.data.success) {
        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === editingSession.id ? { ...session, name } : session
          )
        );
        toast.success("Session name updated successfully");
        setEditingSession(null);
      } else {
        throw new Error(response.data.error || "Failed to update session name");
      }
    } catch (error: any) {
      console.error("Failed to update session name:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to update session name"
      );
    } finally {
      setIsEditingSession(false);
    }
  };

  const handleDeleteSession = async (session: Session) => {
    if (readonly) {
      toast.error("Cannot delete sessions in analytics view.");
      return;
    }

    if (session.id === currentSessionId) {
      toast.error("Cannot delete the current session");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this session? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsDeletingSession(session.id);
      const response = await apiClient.delete("/api/deleteSession", {
        params: {
          sessionId: session.id,
          agentId: agentId,
        },
        headers: {
          "x-agent-id": agentId,
        },
      });

      if (response.data.success) {
        setSessions((prevSessions) =>
          prevSessions.filter((s) => s.id !== session.id)
        );
        toast.success("Session deleted successfully");
      } else {
        throw new Error(response.data.error || "Failed to delete session");
      }
    } catch (error: any) {
      console.error("Failed to delete session:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to delete session"
      );
    } finally {
      setIsDeletingSession(null);
    }
  };

  const handleViewSession = async (session: Session) => {
    try {
      setActiveSession(session);
      if (onSessionSelect) {
        await onSessionSelect(session.id);
      }
    } catch (error) {
      console.error("Failed to select session:", error);
      toast.error("Failed to switch session");
    }
  };

  const handleCreateSession = async () => {
    if (isCreating) return;

    if (!canCreateNewSession) {
      toast.error(
        "Multiple sessions are not allowed. Please delete the existing session first."
      );
      return;
    }

    if (readonly) {
      toast.error("Cannot create a new session in analytics view.");
      return;
    }

    setIsCreating(true);
    try {
      if (onSessionCreated) {
        await onSessionCreated();
        toast.success("New session created");
      } else {
        toast.error("Session creation is not available.");
      }
    } catch (error: any) {
      console.error("Failed to create session:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to create session";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Utility constants
  const activeSessionsCount = React.useMemo(
    () => sessions.filter((s) => s.status === "active").length,
    [sessions]
  );

  const canCreateNewSession = React.useMemo(
    () => allowMultipleSessions || activeSessionsCount === 0,
    [allowMultipleSessions, activeSessionsCount]
  );

  // Dream UI components
  const DreamTableHeader = ({ children }: { children: React.ReactNode }) => (
    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-300 first:pl-8 last:pr-8">
      {children}
    </th>
  );

  const DreamTableCell = ({ children }: { children: React.ReactNode }) => (
    <td className="px-6 py-4 text-sm text-neutral-300 first:pl-8 last:pr-8">
      {children}
    </td>
  );

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
        placeholder="Search sessions..."
        className="
          h-10 w-[250px] rounded-xl 
          bg-neutral-900/50 pl-9 pr-4 
          text-sm text-neutral-300 
          placeholder:text-neutral-500
          border border-white/[0.08]
          focus:border-dream-purple/50 
          focus:ring-dream-purple/20
          transition-all duration-300
          backdrop-blur-md
        "
      />
    </div>
  );

  const DreamToolbar = ({ table }: { table: Table<RowData> }) => {
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

  const DreamPagination = ({ table }: { table: Table<RowData> }) => {
    return (
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <span>·</span>
          <span>{table.getFilteredRowModel().rows.length} row(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="
              px-3 py-1.5 rounded-xl 
              bg-neutral-900/50 text-neutral-300 
              text-sm hover:bg-neutral-800/50 
              disabled:opacity-50 disabled:cursor-not-allowed 
              transition-colors duration-300 shine
            "
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="
              px-3 py-1.5 rounded-xl 
              bg-neutral-900/50 text-neutral-300 
              text-sm hover:bg-neutral-800/50 
              disabled:opacity-50 disabled:cursor-not-allowed 
              transition-colors duration-300 shine
            "
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Main return
  if (activeSession) {
    return (
      <SessionDetails
        session={activeSession}
        onBack={() => setActiveSession(null)}
        isCurrentSession={activeSession.id === currentSessionId}
      />
    );
  }

  return (
    <div className="relative animate-fade-in-up space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-light text-white">Sessions</h2>

          {/* Single Session Mode Badge */}
          {!allowMultipleSessions && (
            <Badge
              variant="secondary"
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-light",
                "bg-purple-500/10 border-purple-500/20 text-purple-500",
                "backdrop-blur-md"
              )}
            >
              Single Session Mode
            </Badge>
          )}

          {/* Current Session Badge */}
          {currentSessionId && (
            <Badge
              variant="outline"
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-light",
                "bg-blue-500/10 border-blue-500/20 text-blue-500",
                "backdrop-blur-md"
              )}
            >
              Current:{" "}
              {sessions.find((s) => s.id === currentSessionId)?.name ||
                currentSessionId}
            </Badge>
          )}
        </div>

        {/* Conditionally render the New Session Button only if not readonly */}
        {!readonly && (
          <Button
            onClick={handleCreateSession}
            className={cn(
              "h-9 px-4 rounded-xl text-white/70 font-light",
              "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500",
              "hover:from-cyan-500 hover:via-purple-500 hover:to-pink-500",
              "transition-all duration-500 ease-in-out",
              "shadow-md hover:shadow-lg"
            )}
            disabled={isCreating || !canCreateNewSession}
            title={
              !canCreateNewSession
                ? "Delete existing session to create a new one"
                : undefined
            }
            aria-label="Create a new session"
          >
            {isCreating ? (
              <LoadingState />
            ) : (
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Session</span>
              </div>
            )}
          </Button>
        )}
      </div>

      {isLoadingSessions ? (
        // Loading State
        <div className="flex justify-center items-center py-12">
          <LoadingState />
        </div>
      ) : sessions.length === 0 ? (
        // No Sessions Found
        <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-fade-in-up">
          {/* Empty State Icon */}
          <div className="rounded-full bg-neutral-800/50 p-6 backdrop-blur-md shadow-md">
            <Inbox className="h-12 w-12 text-white/20" />
          </div>
          {/* Messages */}
          <p className="text-sm text-white/50 font-light">
            No active sessions found
          </p>
          <p className="text-xs text-white/30 font-light">
            Create a new session to get started
          </p>
        </div>
      ) : (
        // Sessions Table
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
                                className={`
                                  ml-auto h-4 w-4 
                                  transition-colors duration-300
                                  ${
                                    header.column.getIsSorted()
                                      ? "text-dream-purple"
                                      : "text-neutral-500 hover:text-neutral-300"
                                  }
                                `}
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
                        colSpan={table.getAllColumns().length}
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
      )}

      {/* Edit Session Modal */}
      <EditSessionModal
        session={editingSession}
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSave={handleEditSession}
        isSaving={isEditingSession}
      />
    </div>
  );
}
