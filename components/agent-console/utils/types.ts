// utils/types.ts

import { SelectOnboardingSession } from '@/lib/schema';
import { Agent, AgentSettings, Step } from '@/lib/types';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';

export interface Session {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'abandoned';
  type: string;
  createdAt: string;
  lastInteractionAt?: string;
  stepProgress: {
    steps: Step[];
  };
}

export interface DraftEmail {
  to: string;
  subject: string;
  firstName: string;
  body?: string;
}

export interface AgentConsoleProps {
  agent: Agent;
}

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
}

export interface OnboardingProgressSidebarProps {
  emailSent: boolean;
  notesTaken: boolean;
  notionMessageSent: boolean;
  memoryKv: { [key: string]: any };
  steps: Step[];
  title?: string;
  logo?: string | null;
  availableTools: string[];
  agentId: string;
  onStepsUpdated: () => Promise<void>;
  primaryColor: string;
  secondaryColor: string;
  currentSessionId: string | null;
}

export interface FooterProps {
  isConnected: boolean;
  isRecording: boolean;
  canPushToTalk: boolean;
  connectConversation: () => Promise<void>;
  disconnectConversation: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  changeTurnEndType: (value: string) => void;
  clientCanvasRef: React.RefObject<HTMLCanvasElement>;
  serverCanvasRef: React.RefObject<HTMLCanvasElement>;
  wavRecorder: WavRecorder;
  wavStreamPlayer: WavStreamPlayer;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface NavbarProps {
  LOCAL_RELAY_SERVER_URL: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  primaryColor: string;
  secondaryColor: string;
}


export interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}