// components/agent-console/TabContent/index.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { fadeAnimation } from '../utils/constants';
import ConversationTab from './ConversationTab';
import WorkspaceTab from './WorkspaceTab';
import  SessionsTab  from './SessionsTab';
import { IntegrationsTab } from './IntegrationsTab';
import { DraftEmail } from '../utils/types';
import { Session } from '@/lib/types';
import { useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

console.log('ConversationTab:', ConversationTab); // Should log the component function
console.log('WorkspaceTab:', WorkspaceTab);       // Should log the component function
console.log('SessionsTab:', SessionsTab);         // Should log the component function
console.log('IntegrationsTab:', IntegrationsTab); // Should log the component function

export interface TabContentProps {
  activeTab: string;
  agentId: string;
  items: any[];
  draftNote: string | null;
  draftEmail: DraftEmail | null;
  isEditingDraft: boolean;
  isEditingEmail: boolean;
  handleEditDraft: () => void;
  handleEditEmail: () => void;
  handleSaveDraft: (draft: string) => void;
  handleSaveEmail: (email: DraftEmail) => void;
  handleSendNote: () => Promise<void>;
  handleSendEmail: () => Promise<void>;
  setDraftNote: (note: string | null) => void;
  setDraftEmail: (email: DraftEmail | null) => void;
  sessions: Session[];
  isLoadingSessions: boolean;
  createNewSession: () => Promise<string | null>;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => Promise<void>;
  primaryColor: string;
  secondaryColor: string;
  allowMultipleSessions?: boolean;
}

export function TabContent({
  activeTab,
  agentId,
  items,
  draftNote,
  draftEmail,
  isEditingDraft,
  isEditingEmail,
  handleEditDraft,
  handleEditEmail,
  handleSaveDraft,
  handleSaveEmail,
  handleSendNote,
  handleSendEmail,
  setDraftNote,
  setDraftEmail,
  sessions,
  isLoadingSessions,
  createNewSession,
  currentSessionId,
  onSessionSelect,
  primaryColor,
  secondaryColor,
  allowMultipleSessions,
}: TabContentProps) {
  // Handle session creation
  const handleSessionCreated = useCallback(async () => {
    try {
      const sessionId = await createNewSession();
      if (sessionId) {
        await apiClient.setCurrentSession(sessionId);
        toast.success('New session created');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  }, [createNewSession]);

  const handleSessionSelectCallback = useCallback(
    async (sessionId: string) => {
      try {
        await apiClient.setCurrentSession(sessionId);
        await onSessionSelect(sessionId);
      } catch (error) {
        console.error('Error selecting session:', error);
        toast.error('Failed to switch session');
      }
    },
    [onSessionSelect]
  );

  // Component to show when active session is required
  const NoActiveSessionPrompt = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <h3 className="text-lg font-medium text-neutral-400">No Active Session</h3>
      <p className="text-sm text-neutral-500">
        Create or select a session to access this feature
      </p>
      <Button
        onClick={handleSessionCreated}
        className={cn(
          'px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 shine'
        )}
        style={{
          backgroundColor: primaryColor,
          borderColor: primaryColor,
          borderWidth: '1px',
          borderStyle: 'solid',
        }}
      >
        Create New Session
      </Button>
    </div>
  );

  // Render appropriate tab content based on requirements
  const renderTabContent = () => {
    switch (activeTab) {
      case 'workspace':
        return currentSessionId ? (
          <WorkspaceTab
            draftNote={draftNote}
            draftEmail={draftEmail}
            isEditingDraft={isEditingDraft}
            isEditingEmail={isEditingEmail}
            handleEditDraft={handleEditDraft}
            handleEditEmail={handleEditEmail}
            handleSaveDraft={handleSaveDraft}
            handleSaveEmail={handleSaveEmail}
            handleSendNote={handleSendNote}
            handleSendEmail={handleSendEmail}
            setDraftNote={setDraftNote}
            setDraftEmail={setDraftEmail}
            currentSessionId={currentSessionId}
           
          />
        ) : (
          <NoActiveSessionPrompt />
        );

      case 'conversation':
        return currentSessionId ? (
          <ConversationTab
            items={items}
            currentSessionId={currentSessionId}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        ) : (
          <NoActiveSessionPrompt />
        );

      case 'sessions':
        return (
          <SessionsTab
            sessions={sessions}
            isLoadingSessions={isLoadingSessions}
            onSessionCreated={handleSessionCreated}
            onSessionSelect={handleSessionSelectCallback}
            agentId={agentId}
            currentSessionId={currentSessionId}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            allowMultipleSessions={allowMultipleSessions}
          />
        );

      case 'integrations':
        return <IntegrationsTab />;

      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeAnimation}
        className="h-full"
      >
        {renderTabContent()}

        {/* Show session badge only when there's an active session */}
        {currentSessionId && activeTab !== 'sessions' && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-black/80 text-white text-xs px-3 py-1.5 rounded-full border border-gray-700">
              Session: {currentSessionId}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Update WorkspaceTab and ConversationTab interfaces
interface WorkspaceTabProps {
  draftNote: string | null;
  draftEmail: DraftEmail | null;
  isEditingDraft: boolean;
  isEditingEmail: boolean;
  handleEditDraft: () => void;
  handleEditEmail: () => void;
  handleSaveDraft: (draft: string) => void;
  handleSaveEmail: (email: DraftEmail) => void;
  handleSendNote: () => Promise<void>;
  handleSendEmail: () => Promise<void>;
  setDraftNote: (note: string | null) => void;
  setDraftEmail: (email: DraftEmail | null) => void;
  currentSessionId: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface ConversationTabProps {
  items: any[];
  currentSessionId: string | null;
  primaryColor: string;
  secondaryColor: string;
}

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

export type { WorkspaceTabProps, ConversationTabProps, SessionsTabProps };
