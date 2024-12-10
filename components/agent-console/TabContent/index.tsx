// /Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/agent-console/TabContent/index.tsx
import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeAnimation } from '../utils/constants';
import ConversationTab from './ConversationTab';
import WorkspaceTab from './WorkspaceTab';
import SessionsTab from './SessionsTab';
import { IntegrationsTab } from './IntegrationsTab';
import { DraftEmail, DraftLead } from '../utils/types';
import { Session } from '@/lib/types';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  conversationId: string | null;
  connectConversation: () => Promise<void>;

  draftLead: DraftLead | null;
  isEditingLead: boolean;
  handleEditLead: () => void;
  handleSaveLead: (lead: DraftLead) => void;
  handleSendLead: () => Promise<void>;
  setDraftLead: (lead: DraftLead | null) => void;
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
  conversationId,
  connectConversation,
}: TabContentProps) {
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

  type TabRequirements = {
    requiresSession: boolean;
    requiresConversation: boolean;
  };

  const tabRequirements: Record<string, TabRequirements> = {
    workspace: { requiresSession: true, requiresConversation: true },
    conversation: { requiresSession: true, requiresConversation: true },
    sessions: { requiresSession: false, requiresConversation: false },
    integrations: { requiresSession: false, requiresConversation: false },
  };

  const renderTabContent = () => {
    if (activeTab === 'sessions' && allowMultipleSessions === false) {
      return null;
    }

    const requirements = tabRequirements[activeTab] || {
      requiresSession: false,
      requiresConversation: false,
    };

    const shouldShowNoSessionPrompt =
      (requirements.requiresSession && !currentSessionId) ||
      (requirements.requiresConversation && !conversationId);

    if (shouldShowNoSessionPrompt) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <h3 className="text-lg font-medium text-neutral-400">
            No Active Session
          </h3>
          <p className="text-sm text-neutral-500">
            Create a new session to access this feature
          </p>
          <Button
            onClick={handleSessionCreated}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 shine'
            )}
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            New Session
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'workspace':
        // Provide placeholder lead-related props to avoid TypeScript errors
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
            isRecording={false}
            isListening={false}
            draftLead={null}
            isEditingLead={false}
            handleEditLead={() => {}}
            handleSaveLead={() => {}}
            handleSendLead={async () => {}}
            setDraftLead={() => {}}
          />
        );

      case 'conversation':
        return (
          <ConversationTab
            items={items}
            currentSessionId={currentSessionId}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        );

      case 'sessions':
        if (allowMultipleSessions === false) {
          return null;
        }
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
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center space-x-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full border border-gray-700">
            <span>Powered by</span>
            <img 
              src="/onboardfi-logo-q4.png" 
              alt="OnboardFi Logo" 
              className="h-4 w-auto" 
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Updated WorkspaceTabProps and ConversationTabProps interfaces are already defined in WorkspaceTab.tsx.
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: {
    text?: string;
    transcript?: string;
    audioUrl?: string;
  }[];
  metadata?: {
    audioDurationSeconds?: number;
    audio?: {
      sampleRate: number;
      channels?: number;
    };
    stepTitle?: string;
  };
  status: 'completed' | 'pending';
}

interface ConversationTabProps {
  items: ConversationMessage[];
  currentSessionId: string | null;
  primaryColor?: string;
  secondaryColor?: string;
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

export type { ConversationTabProps, SessionsTabProps };
