// components/agent-console/TabContent/SessionsTab.tsx


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Eye, Settings, Trash2, Inbox, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from "../shared/LoadingState";
import { cn } from "@/lib/utils";
import apiClient from '@/lib/api-client';
import { Session, Step } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { EditSessionModal } from './EditSessionModal';
import { useState, useEffect, useMemo } from 'react'; // Add useMemo to imports
// Session Details Component remains unchanged
const SessionDetails = ({ 
  session, 
  onBack,
  isCurrentSession
}: { 
  session: Session; 
  onBack: () => void;
  isCurrentSession: boolean;
}) => {
  if (!session) return null;

  return (
    <Card className="bg-black border border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="flex items-center text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
          <CardTitle className="text-sm font-medium text-white">
            {session.name}
          </CardTitle>
          {isCurrentSession && (
            <Badge variant="outline" className="ml-2 text-white">Current Session</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.stepProgress?.steps.map((step) => (
          <Card key={step.id} className="bg-gray-900 border border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">{step.title}</h4>
                  <p className="text-sm text-gray-400">{step.description}</p>
                </div>
                <Badge
                  variant={step.completed ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    step.completed ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-400"
                  )}
                >
                  {step.completed ? "Completed" : "Pending"}
                </Badge>
              </div>
              {step.completedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Completed: {new Date(step.completedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

interface SessionsTabProps {
  sessions: Session[];
  isLoadingSessions: boolean;
  onSessionCreated?: () => Promise<void>;
  onSessionSelect?: (sessionId: string) => Promise<void>;
  agentId: string;
  currentSessionId: string | null;
  secondaryColor: string;
  allowMultipleSessions?: boolean; // Add this prop
}
export function SessionsTab({ 
  sessions: initialSessions, 
  isLoadingSessions, 
  onSessionCreated,
  onSessionSelect,
  agentId,
  currentSessionId,
  secondaryColor,
  allowMultipleSessions = true // Default to true for backward compatibility
}: SessionsTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [isDeletingSession, setIsDeletingSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isEditingSession, setIsEditingSession] = useState(false);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const getCompletionPercentage = (session: Session) => {
    if (!session.stepProgress?.steps.length) return 0;
    const completed = session.stepProgress.steps.filter(step => step.completed).length;
    return Math.round((completed / session.stepProgress.steps.length) * 100);
  };

  const getCompletionStatus = (session: Session) => {
    const percentage = getCompletionPercentage(session);
    if (percentage === 100) return 'complete';
    if (percentage === 0) return 'not-started';
    return 'in-progress';
  };
  const handleEditSession = async (name: string) => {
    if (!editingSession) return;

    try {
      setIsEditingSession(true);
      const response = await apiClient.patch('/api/updateSession', {
        sessionId: editingSession.id,
        name,
      }, {
        headers: {
          'x-agent-id': agentId
        }
      });

      if (response.data.success) {
        setSessions(prevSessions =>
          prevSessions.map(session =>
            session.id === editingSession.id
              ? { ...session, name }
              : session
          )
        );
        toast.success('Session name updated successfully');
        setEditingSession(null);
      } else {
        throw new Error(response.data.error || 'Failed to update session name');
      }
    } catch (error: any) {
      console.error('Failed to update session name:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update session name');
    } finally {
      setIsEditingSession(false);
    }
  };
  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };

  // Get active sessions count
  const activeSessionsCount = useMemo(() => 
    sessions.filter(s => s.status === 'active').length, 
    [sessions]
  );

  const canCreateNewSession = useMemo(() => 
    allowMultipleSessions || activeSessionsCount === 0,
    [allowMultipleSessions, activeSessionsCount]
  );

  // Update the create session handler to check the limit
  const handleCreateSession = async () => {
    if (isCreating) return;
    
    if (!canCreateNewSession) {
      toast.error(
        'Multiple sessions are not allowed. Please delete the existing session first.'
      );
      return;
    }
    
    setIsCreating(true);
    try {
      await onSessionCreated?.();
      toast.success('New session created');
    } catch (error: any) {
      console.error('Failed to create session:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create session';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Update the delete handler to ensure we're checking session status
  const handleDeleteSession = async (session: Session) => {
    if (session.id === currentSessionId) {
      toast.error("Cannot delete the current session");
      return;
    }

    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeletingSession(session.id);
      const response = await apiClient.delete('/api/deleteSession', {
        params: { 
          sessionId: session.id,
          agentId: agentId
        },
        headers: {
          'x-agent-id': agentId
        }
      });

      if (response.data.success) {
        setSessions(prevSessions => 
          prevSessions.filter(s => s.id !== session.id)
        );
        toast.success('Session deleted successfully');
      } else {
        throw new Error(response.data.error || 'Failed to delete session');
      }
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to delete session');
    } finally {
      setIsDeletingSession(null);
    }
  };
  
  const handleViewSession = async (session: Session) => {
    try {
      setActiveSession(session);
      await onSessionSelect?.(session.id);
    } catch (error) {
      console.error('Failed to select session:', error);
      toast.error('Failed to switch session');
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
    <>
    <Card className="bg-black border border-gray-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-4">
            <CardTitle className="text-sm font-medium text-white">
              Onboarding Sessions
            </CardTitle>
            {!allowMultipleSessions && (
              <Badge variant="secondary" className="text-xs">
                Single Session Mode
              </Badge>
            )}
            {currentSessionId && (
              <Badge variant="outline" className="text-xs text-white">
                Current: {sessions.find(s => s.id === currentSessionId)?.name || currentSessionId}
              </Badge>
            )}
          </div>
          <Button
            onClick={handleCreateSession}
            size="sm"
            className="h-8 text-xs flex items-center"
            disabled={isCreating || !canCreateNewSession}
            variant={isCreating ? "outline" : "default"}
            style={!isCreating && canCreateNewSession ? { backgroundColor: secondaryColor } : undefined}
            title={!canCreateNewSession ? 'Delete existing session to create a new one' : undefined}
          >
            {isCreating ? (
              <LoadingState />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </>
            )}
          </Button>
        </CardHeader>
      <CardContent>
        {isLoadingSessions ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-lg bg-gray-900 p-4">
              <Inbox className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">No active sessions found</p>
            <p className="text-xs text-gray-500">Create a new session to get started</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="relative overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-gray-400">Name</th>
                    <th scope="col" className="px-6 py-4 text-gray-400">Progress</th>
                    <th scope="col" className="px-6 py-4 text-gray-400">Created</th>
                    <th scope="col" className="px-6 py-4 text-gray-400">Last Active</th>
                    <th scope="col" className="px-6 py-4 text-right text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sessions.map((session) => (
                    <tr 
                      key={session.id} 
                      className={cn(
                        "hover:bg-gray-900/50",
                        session.id === currentSessionId && "bg-gray-900/25"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full mr-2",
                            {
                              'bg-green-500': getCompletionStatus(session) === 'complete',
                              'bg-yellow-500': getCompletionStatus(session) === 'in-progress',
                              'bg-gray-500': getCompletionStatus(session) === 'not-started'
                            }
                          )}></div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-white font-mono">{session.name}</span>
                            {session.id === currentSessionId && (
                              <Badge variant="outline" className="text-[10px] text-white">Current</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-1 transition-all duration-500"
                              style={{ 
                                width: `${getCompletionPercentage(session)}%`,
                                backgroundColor: secondaryColor
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">
                            {getCompletionPercentage(session)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            ({session.stepProgress.steps.filter(s => s.completed).length}/{session.stepProgress.steps.length} steps)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {getTimeAgo(session.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {session.lastInteractionAt 
                            ? getTimeAgo(session.lastInteractionAt)
                            : 'Never'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 w-8 p-0",
                              session.id === currentSessionId && "bg-blue-500/10 text-blue-500"
                            )}
                            onClick={() => handleViewSession(session)}
                          >
                                 <Eye className="h-4 w-4 text-gray-400" />

                          </Button>
                          <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setEditingSession(session)}
        >
          <Settings className="h-4 w-4 text-gray-400" />
        </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 w-8 p-0 hover:text-red-500",
                              isDeletingSession === session.id && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={session.id === currentSessionId || isDeletingSession === session.id}
                            onClick={() => handleDeleteSession(session)}
                          >
                            {isDeletingSession === session.id ? (
                              <LoadingState  />
                            ) : (
                              <Trash2 className={cn(
                                "h-4 w-4",
                                session.id === currentSessionId ? "text-gray-600" : "text-gray-400"
                              )}/>
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
        )}
      </CardContent>
    </Card>
    <EditSessionModal
        session={editingSession}
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSave={handleEditSession}
        isSaving={isEditingSession}
      />
    </>

);
}