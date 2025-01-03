// components/agent-console/utils/types.ts

import { Agent, MessageMetadata, Step } from '@/lib/types';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';

/**
 * **Content Interface**
 * Merged interface for message content.
 */
export interface Content {
  type: string;
  text?: string;
  transcript?: string;
  audio?: string;
  audioUrl?: string; // Changed from string | null to string | undefined
  truncated?: boolean;
  audio_end_ms?: number;
}



export interface Tool {
  type: string;
  name: string;
  description: string;
  parameters: object;
}

export interface DraftLead {
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}

// Add this new interface for function calls
export interface FunctionCall {
  name: string;
  arguments: string;
  call_id?: string;
}

/**
 * **ConversationItem Interface**
 */
// Remove this duplicate interface since you're importing it
// Update the ConversationItem interface
export interface ConversationItem {
  id: string;
  object: 'realtime.item';
  type: string | 'function_call'; // Add function_call as a possible type
  role: string;
  status: 'completed' | 'pending' | 'in_progress';
  content: Array<{
    type: string;
    text?: string;
    transcript?: string;
    audioUrl?: string;
    function_call?: FunctionCall; // Add function_call property
  }>;
  name?: string;        // Add for function calls
  call_id?: string;     // Add for function calls
  arguments?: string;   // Add for function calls
  metadata?: Record<string, any>;
  stepId?: string;
  parentMessageId?: string;
  orderIndex?: string;
}
/**
 * **WebSocketError Interface**
 */
export interface WebSocketError {
  type: string;
  code: string;
  message: string;
  param: string | null;
  event_id: string;
}






/**
 * **SessionMetadata Interface**
 * Represents detailed session configuration.
 */
export interface SessionMetadata {
  id: string;
  object: string;
  model: string;
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription: object | null;
  turn_detection: object | null;
  tools: any[];
  tool_choice: string;
  temperature: number;
  max_response_output_tokens: number | null;
}

/**
 * **UserSession Interface**
 * Represents user-specific session details.
 */
export interface UserSession {
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

/**
 * **Conversation Interface**
 */
export interface Conversation {
  id: string;
  object: string;
}

/**
 * **WebSocketMessageItem Interface**
 */
export interface WebSocketMessageItem {
  id: string;
  role: string;
  status: string;
  formatted?: {
    text?: string;
    transcript?: string;
    audio?: boolean;
  };
  metadata?: {
    conversationId?: string;
    stepTitle?: string;
    clientId?: string;
    toolCalls?: any[];
    audioDurationSeconds?: number;
    [key: string]: any;
  };
}

/**
 * **WebSocketPayload Interface**
 */
export interface WebSocketPayload {
  item?: WebSocketMessageItem;
  delta?: {
    audio: number[];
  };
  event?: {
    type: string;
    time?: string;
    source?: 'client' | 'server';
    [key: string]: any;
  };
  messages?: Array<{
    type: string;
    text: string;
  }>;
  instructions?: string;
  input_audio_transcription?: {
    model: string;
  };
  metadata?: {
    sessionId: string | null;
    conversationId?: string;
    agentId?: string;
    clientId?: string;
    timestamp?: string;
  };
  [key: string]: any;
}







export interface MessageContent {
  text?: string;
  transcript?: string;
  audioUrl?: string;
  type?: string;  // Add this to support function call type
  function_call?: FunctionCall; // Add this for function calls
}

// Make sure the ToolCall interface has required fields
export interface ToolCall {
  tool: string;         // Make this required (no undefined)
  input: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  timestamp: string;
  duration?: number;
}
/**
 * **WebSocketMessage Interface**
 */
export interface WebSocketMessage {
  type: string;
  message?: string;
  event_id?: string;
  session?: SessionMetadata | UserSession;
  payload?: WebSocketPayload;
  [key: string]: any;
}

/**
 * **RealtimeEvent Interface**
 */
export interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: {
    type: string;
    [key: string]: any;
  };
}

/**
 * **Session Interface**
 * Represents user-specific session details.
 * Renamed to avoid conflict with SessionMetadata.
 */
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

/**
 * **DraftEmail Interface**
 */
export interface DraftEmail {
  to: string;
  subject: string;
  firstName: string;
  body?: string;
}

/**
 * **TabContentProps Interface**
 */
export interface TabContentProps {
  activeTab: string;
  agentId: string;
  items: ConversationItem[]; // Updated to use ConversationItem
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
  sessions: UserSession[]; // Updated to use UserSession
  isLoadingSessions: boolean;
  createNewSession: () => Promise<string | null>;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => Promise<void>;

  draftLead: DraftLead | null;
  isEditingLead: boolean;
  handleEditLead: () => void;
  handleSaveLead: (lead: DraftLead) => void;
  handleSendLead: () => Promise<void>;
  setDraftLead: (lead: DraftLead | null) => void;
}
/**
 * **OnboardingProgressSidebarProps Interface**
 */
export interface OnboardingProgressSidebarProps {
  emailSent: boolean;
  notesTaken: boolean;
  notionMessageSent: boolean;
  mondayLeadCreated: boolean;  // Add this line
  memoryKv: { [key: string]: any };
  steps?: Step[];
  title?: string;
  logo?: string | null;
  availableTools: string[];
  agentId: string;
  onStepsUpdated: () => void;
  primaryColor: string;
  secondaryColor: string;
  currentSessionId: string | null;
}
/**
 * **FooterProps Interface**
 */
export interface FooterProps {
  isConnected: boolean;
  isRecording: boolean;
  canPushToTalk: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  connectConversation: () => Promise<void>;
  disconnectConversation: () => Promise<void>;
  changeTurnEndType: (value: string) => void;
  clientCanvasRef: React.RefObject<HTMLCanvasElement>;
  serverCanvasRef: React.RefObject<HTMLCanvasElement>;
  wavRecorder: WavRecorder;
  wavStreamPlayer: WavStreamPlayer;
  primaryColor?: string;
  secondaryColor?: string;
  isListening: boolean; // Added this line
}

/**
 * **ConversationControlsProps Interface**
 * Extends FooterProps to inherit all properties.
 */
export interface ConversationControlsProps extends FooterProps {}

/**
 * **NavbarProps Interface**
 */
export interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

/**
 * **AgentConsoleProps Interface**
 */


// Ensure AgentSettings interface is defined
export interface AgentSettings {
  headingText?: string;
  tools?: string[];
  initialMessage?: string;
  steps?: Step[];
  primaryColor?: string;
  secondaryColor?: string;
  aiModel?: string;
  apiKeys?: {
    [model: string]: string;
  };
  onboardingType?: 'internal' | 'external';
  allowMultipleSessions?: boolean;
  authentication?: {
    enabled: boolean;
    password?: string;
    message?: string;
  };
  [key: string]: any;
}

// Keep only this version of AgentConsoleProps
export interface AgentConsoleProps {
  agent: {
    id: string;
    name?: string | null;
    settings: AgentSettings;  // Use the AgentSettings interface
    site?: {
      logo?: string | null;
      organizationId?: string;
    };
    [key: string]: any;
  };
}