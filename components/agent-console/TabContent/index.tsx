// components/agent-console/TabContent/index.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { fadeAnimation } from '../utils/constants';
import { WorkspaceTab } from './WorkspaceTab';
import { ConversationTab } from './ConversationTab';
import { SessionsTab } from './SessionsTab';
import { IntegrationsTab } from './IntegrationsTab';
import { DraftEmail } from '../utils/types';
import { Session } from '@/lib/types';
import { useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

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
  secondaryColor: string; // Add this line
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
  secondaryColor // Add this line
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

  // Handle session selection
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    try {
      await apiClient.setCurrentSession(sessionId);
      await onSessionSelect(sessionId);
    } catch (error) {
      console.error('Error selecting session:', error);
      toast.error('Failed to switch session');
    }
  }, [onSessionSelect]);

  // Render appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'workspace':
        return (
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
        );

      case 'conversation':
        return (
          <ConversationTab 
            items={items}
            currentSessionId={currentSessionId}
          />
        );

        case 'sessions':
          return (
            <SessionsTab 
              sessions={sessions}
              isLoadingSessions={isLoadingSessions}
              onSessionCreated={handleSessionCreated}
              onSessionSelect={handleSessionSelect}
              agentId={agentId}
              currentSessionId={currentSessionId}
              secondaryColor={secondaryColor}
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
        {currentSessionId ? (
          renderTabContent()
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium text-gray-400">
                No Active Session
              </h3>
              <p className="text-sm text-gray-500">
                Create or select a session to begin
              </p>
              <button
                onClick={handleSessionCreated}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Session
              </button>
            </div>
          </div>
        )}

        {/* Session ID Badge */}
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
}

interface ConversationTabProps {
  items: any[];
  currentSessionId: string | null;
}

export type { WorkspaceTabProps, ConversationTabProps };