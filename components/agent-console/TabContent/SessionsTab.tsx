// SessionsTab.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Eye, Settings, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "../shared/LoadingState";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { Session } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { EditSessionModal } from "./EditSessionModal";
import { useState, useEffect, useMemo } from "react";
import SessionDetails from "./SessionDetails";


interface SessionsTabProps {
  sessions: Session[];
  isLoadingSessions: boolean;
  onSessionCreated: () => Promise<void>;
  onSessionSelect: (sessionId: string) => Promise<void>;
  agentId: string;
  currentSessionId: string | null;
  primaryColor: string;
  secondaryColor: string;
  allowMultipleSessions?: boolean;
}

export function SessionsTab({
  sessions: initialSessions,
  isLoadingSessions,
  onSessionCreated,
  onSessionSelect,
  agentId,
  currentSessionId,
  secondaryColor,
  allowMultipleSessions = true,
}: SessionsTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [isDeletingSession, setIsDeletingSession] = useState<string | null>(
    null
  );
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isEditingSession, setIsEditingSession] = useState(false);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const getCompletionPercentage = (session: Session) => {
    if (!session.stepProgress?.steps.length) return 0;
    const completed = session.stepProgress.steps.filter(
      (step) => step.completed
    ).length;
    return Math.round((completed / session.stepProgress.steps.length) * 100);
  };

  const getCompletionStatus = (session: Session) => {
    const percentage = getCompletionPercentage(session);
    if (percentage === 100) return "complete";
    if (percentage === 0) return "not-started";
    return "in-progress";
  };

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

  // Get active sessions count
  const activeSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === "active").length,
    [sessions]
  );

  const canCreateNewSession = useMemo(
    () => allowMultipleSessions || activeSessionsCount === 0,
    [allowMultipleSessions, activeSessionsCount]
  );

  const handleCreateSession = async () => {
    if (isCreating) return;

    if (!canCreateNewSession) {
      toast.error(
        "Multiple sessions are not allowed. Please delete the existing session first."
      );
      return;
    }

    setIsCreating(true);
    try {
      await onSessionCreated?.();
      toast.success("New session created");
    } catch (error: any) {
      console.error("Failed to create session:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to create session";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (session: Session) => {
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
      await onSessionSelect?.(session.id);
    } catch (error) {
      console.error("Failed to select session:", error);
      toast.error("Failed to switch session");
    }
  };

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
    <div className="relative animate-fade-in-up">
      {/* Card Container */}
      <Card className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-lg">
        {/* Card Header */}
        <CardHeader className="relative space-y-0 pb-2">
          <div className="flex items-center justify-between">
            {/* Title and Badges */}
            <div className="flex items-center space-x-4">
              {/* Title */}
              <CardTitle className="text-sm font-light text-white/90">
                Onboarding Sessions
              </CardTitle>

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

            {/* New Session Button */}
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
          </div>
        </CardHeader>

        {/* Content Area */}
        <CardContent>
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
            <div className="relative overflow-hidden rounded-2xl">
              {/* Scrollable Area */}
              <ScrollArea className="h-[500px]">
                {/* Table Container */}
                <div className="relative overflow-x-auto">
                  {/* Table */}
                  <table className="w-full text-left">
                    {/* Table Head */}
                    <thead className="text-xs uppercase bg-neutral-800/50 backdrop-blur-md">
                      <tr>
                        {/* Column Headers */}
                        <th
                          scope="col"
                          className="px-6 py-4 text-white/50 font-light"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-white/50 font-light"
                        >
                          Progress
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-white/50 font-light"
                        >
                          Created
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-white/50 font-light"
                        >
                          Last Active
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-right text-white/50 font-light"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="divide-y divide-white/10">
                      {sessions.map((session, index) => (
                        <tr
                          key={session.id}
                          className={cn(
                            "hover:bg-white/5 transition-all duration-300",
                            session.id === currentSessionId && "bg-white/5"
                          )}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {/* Session Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {/* Status Indicator */}
                              <div
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full",
                                  {
                                    "bg-green-500":
                                      getCompletionStatus(session) ===
                                      "complete",
                                    "bg-yellow-500":
                                      getCompletionStatus(session) ===
                                      "in-progress",
                                    "bg-white/20":
                                      getCompletionStatus(session) ===
                                      "not-started",
                                  }
                                )}
                              ></div>
                              {/* Session Name */}
                              <span className="text-sm text-white/90 font-mono">
                                {session.name}
                              </span>
                              {/* Current Session Badge */}
                              {session.id === currentSessionId && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-light",
                                    "bg-blue-500/10 border-blue-500/20 text-blue-500",
                                    "backdrop-blur-md"
                                  )}
                                >
                                  Current
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Progress Bar */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {/* Progress Bar Container */}
                              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                {/* Progress Bar */}
                                <div
                                  className={cn(
                                    "h-full transition-all duration-500",
                                    getCompletionStatus(session) ===
                                      "complete" && "bg-green-500",
                                    getCompletionStatus(session) ===
                                      "in-progress" && "bg-yellow-500",
                                    getCompletionStatus(session) ===
                                      "not-started" && "bg-white/20"
                                  )}
                                  style={{
                                    width: `${getCompletionPercentage(
                                      session
                                    )}%`,
                                  }}
                                />
                              </div>
                              {/* Percentage */}
                              <span className="text-sm text-white/50 font-light">
                                {getCompletionPercentage(session)}%
                              </span>
                              {/* Steps Completed */}
                              <span className="text-xs text-white/30 font-light">
                                (
                                {
                                  session.stepProgress.steps.filter(
                                    (s) => s.completed
                                  ).length
                                }
                                /{session.stepProgress.steps.length} steps)
                              </span>
                            </div>
                          </td>

                          {/* Created Time */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-white/50 font-light">
                              {getTimeAgo(session.createdAt)}
                            </span>
                          </td>

                          {/* Last Active */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-white/50 font-light">
                              {session.lastInteractionAt
                                ? getTimeAgo(session.lastInteractionAt)
                                : "Never"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* View Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 w-8 p-0 rounded-full",
                                  "hover:bg-white/5",
                                  "transition-all duration-300",
                                  session.id === currentSessionId &&
                                    "bg-blue-500/10 text-blue-500"
                                )}
                                onClick={() => handleViewSession(session)}
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
                                onClick={() => setEditingSession(session)}
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
                                  isDeletingSession === session.id &&
                                    "opacity-50 cursor-not-allowed"
                                )}
                                disabled={
                                  session.id === currentSessionId ||
                                  isDeletingSession === session.id
                                }
                                onClick={() => handleDeleteSession(session)}
                              >
                                {isDeletingSession === session.id ? (
                                  <LoadingState />
                                ) : (
                                  <Trash2
                                    className={cn(
                                      "h-4 w-4",
                                      session.id === currentSessionId
                                        ? "text-white/20"
                                        : "text-white/70"
                                    )}
                                  />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

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
