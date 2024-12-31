// lib/types.ts

import { FunctionCall } from "@/components/agent-console/utils/types";

/**
 * Core Types for Session Steps and Base Types
 */

// Base step interface that includes all required fields
export interface BaseStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  completionTool: 'email' | 'memory' | 'notesTaken' | 'notion' | 'monday' | null;
}
// Session-specific step interface
export interface SessionStep extends BaseStep {}

// Progress tracking interface
export interface StepProgress {
  steps: Array<BaseStep>;
}


export type MessageType = 'text' | 'audio' | 'transcript';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ConversationStatus = 'active' | 'completed' | 'archived';

export interface MessageContent {
  text?: string;
  transcript?: string;
  audioUrl?: string;
  function_call?: FunctionCall;
}
export interface SelectOrganization {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  logo?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectOrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectOrganizationWithRelations extends SelectOrganization {
  memberships?: SelectOrganizationMembership[];
  sites?: SelectSite[];
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ToolCall {
  tool: string;
  input: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  timestamp: string;
  duration?: number;
}



export interface SelectConversationWithRelations extends SelectConversation {
  session?: {
    id: string;
    organizationId: string;
    user?: {
      id: string;
    };
    agent?: {
      id: string;
      userId: string | null;
      creator?: {
        id: string;
        name: string;
        email: string;
      } | null;
    } | null;
  };
}


// Update your ConversationMetadata interface
export interface ConversationMetadataWithOrg extends ConversationMetadata {
  organizationId: string;
}
export interface Tool {
  type: string;
  name: string;
  description: string;
  parameters: object;
}
export interface MessageMetadata {
  clientId?: string;
  deviceInfo?: Record<string, any>;
  processingTime?: number;
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
  toolCalls?: ToolCall[];
  stepId?: string;
  stepTitle?: string;
  isFinal?: boolean;


  audioDurationSeconds?: number;
  audio?: {
    sampleRate: number;
    channels?: number;
  };


 
  [key: string]: any; // For any additional metadata

}


// Update Site type to include organization
export interface SelectSite {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  font: string;
  image: string | null;
  imageBlurhash: string | null;
  subdomain: string | null;
  customDomain: string | null;
  message404: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  createdBy: string;
  organization: SelectOrganization;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count?: {
    agents: number;
  };
}


export interface Content {
  type: string;
  text?: string;
  transcript?: string;
  audio?: string;
  audioUrl?: string; // Changed from string | null to string | undefined
  truncated?: boolean;
  audio_end_ms?: number;
}
export interface ConversationMetadata {
  agentVersion?: string;
  clientType?: string;
  clientVersion?: string;
  sessionType?: 'internal' | 'external';
  completedSteps?: string[];
  toolsUsed?: string[];
  duration?: number;
  messageCount?: number;
  isAnonymous?: boolean;  // Add this
  isAuthenticated?: boolean;  // Add this
  lastToolUse?: {
    tool: string;
    timestamp: string;
    success: boolean;
  };
}


export interface InviteResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    email: string;
  };
}

export interface OrganizationInvite {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  status: 'pending' | 'accepted' | 'cancelled';
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  organizationName?: string;
  inviterName?: string;
}


export interface ToolCall {
  tool: string;
  input: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  timestamp: string; // Add this line
  duration?: number;
}


export interface SelectMessage {
  id: string;
  conversationId: string;
  type: MessageType;
  role: MessageRole;
  content: MessageContent;
  metadata: MessageMetadata;  // This will now include audioDurationSeconds

  toolCalls: ToolCall[];
  stepId?: string;
  orderIndex: string;
  parentMessageId?: string;
  createdAt: Date;
}

export interface SelectConversation {
  id: string;
  sessionId: string;
  status: ConversationStatus;
  metadata: ConversationMetadata;
  startedAt: Date;
  endedAt?: Date;
  lastMessageAt?: Date;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  messages?: SelectMessage[];
}



// Agent configuration step interface

export interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string | null;
  completionTool: 'email' | 'memory' | 'notesTaken' | 'notion' | 'monday' | null;
}


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
  metadata?: {
    isAnonymous?: boolean;
    isAuthenticated?: boolean;
  };
}
/**
 * Authentication Types
 */
export interface AuthenticationSettings {
  enabled: boolean;
  password?: string;
  message?: string;
}

// Update existing interfaces to include organization context
export interface AgentState {
  agentId: string;
  onboardingType: 'internal' | 'external';
  lastActive: number;
  context: Record<string, any>;
  organizationId: string; // Existing property
  userId?: string; // Optional property
  settings?: AgentSettings; // Optional property if needed
}

export interface ConversationWithSession {
  id: string;
  sessionId: string;
  status: ConversationStatus;
  metadata: Record<string, any>;
  session: {
    id: string;
    organizationId: string;
    userId?: string | null;
    agent?: {
      id: string;
      userId: string | null;
      creator?: {
        id: string;
        name: string;
        email: string;
      } | null;
    } | null;
    user?: {
      id: string;
      userId?: string;  // Add this line to fix the type error
    } | null;
  } | null;
  startedAt: Date;
  endedAt: Date | null;
  lastMessageAt: Date | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}


export interface SessionState {
  sessionId: string;
  agentId: string;
  currentStep: number;
  steps: SessionStep[];
  context: Record<string, any>;
  lastActive: number;
  metadata: { // Removed optional modifier
    organizationId: string;
    userId?: string;
    type?: 'internal' | 'external';
    isAnonymous?: boolean;
    isAuthenticated?: boolean;
    [key: string]: any;
  };
  clientIdentifier?: string;
}


/**
 * Core Agent Types
 */
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
  onboardingType: 'internal' | 'external';
  allowMultipleSessions?: boolean;
  authentication: AuthenticationSettings;
}

export interface Agent {
  site: any;
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  userId: string | null;
  siteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
  settings: AgentSettings;
}

/**
 * Session Management Types
 */
// Update OnboardingSession to include organization
export interface OnboardingSession {
  id: string;
  agentId: string;
  userId: string | null;
  organizationId: string; // Add organization context
  name: string;
  clientIdentifier?: string;
  type: 'internal' | 'external';
  status: 'active' | 'completed' | 'abandoned';
  stepProgress: StepProgress;
  metadata: Record<string, any>;
  lastInteractionAt: Date;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
// lib/types/daily-bot.ts

export type DailyBotToolName = 'memory' | 'email' | 'notion' | 'monday';

export interface DailyBotToolConfig {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const dailyBotTools: Record<DailyBotToolName, DailyBotToolConfig> = {
  memory: {
    type: 'function',
    name: 'store_memory',
    description: 'Store a value in memory with a given key',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' }
      },
      required: ['key', 'value']
    }
  },
  email: {
    type: 'function',
    name: 'send_email',
    description: 'Send an email',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  notion: {
    type: 'function',
    name: 'add_to_notion',
    description: 'Add content to Notion',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string' }
      },
      required: ['content']
    }
  },
  monday: {
    type: 'function',
    name: 'create_lead',
    description: 'Create a new lead in Monday CRM',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        company: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        source: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['firstName', 'lastName']
    }
  }
} as const;
/**
 * Response Types
 */
export interface CreateAgentResponse {
  id?: string;
  error?: string;
}

export interface UpdateAgentMetadataResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export interface OnboardingSessionResponse {
  success: boolean;
  error?: string;
  session?: OnboardingSession;
}

export interface AuthenticationResponse {
  success: boolean;
  error?: string;
  token?: string;
}

/**
 * WebSocket Event Types
 */
export interface SessionUpdateEvent {
  type: 'session-update';
  sessionId: string;
  data: {
    currentStep: number;
    steps: SessionStep[];
    status: OnboardingSession['status'];
  };
}

export interface AgentStateEvent {
  type: 'agent-state';
  agentId: string;
  data: AgentState;
}



/**
 * API Error Types
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Cache Control Types
 */
export interface CacheControl {
  maxAge: number;
  staleWhileRevalidate?: number;
  tags?: string[];
}

/**
 * Domain Management Types
 */
export type DomainVerificationStatusProps =
  | "Valid Configuration"
  | "Invalid Configuration"
  | "Pending Verification"
  | "Domain Not Found"
  | "Unknown Error";

export interface DomainVerification {
  type: string;
  domain: string;
  value: string;
  reason: string;
}


// Add organization-specific response types
export interface CreateOrganizationResponse {
  id?: string;
  error?: string;
}

export interface UpdateOrganizationResponse {
  success: boolean;
  error?: string;
  data?: SelectOrganization;
}

export interface OrganizationMembershipResponse {
  success: boolean;
  error?: string;
  membership?: SelectOrganizationMembership;
}

// Update existing response types to include organization context
export interface CreateSiteResponse {
  id?: string;
  error?: string;
  organizationId?: string;
}

export interface UpdateSiteResponse {
  success: boolean;
  error?: string;
  data?: SelectSite;
}

// Add organization-specific event types
export interface OrganizationUpdateEvent {
  type: 'organization-update';
  organizationId: string;
  data: {
    name?: string;
    slug?: string;
    logo?: string;
    updatedAt: Date;
  };
}

export interface MembershipUpdateEvent {
  type: 'membership-update';
  organizationId: string;
  userId: string;
  data: {
    role?: 'owner' | 'admin' | 'member';
    updatedAt: Date;
  };
}

// Update WebSocketEvent type
export type WebSocketEvent = 
  | SessionUpdateEvent 
  | AgentStateEvent 
  | OrganizationUpdateEvent 
  | MembershipUpdateEvent;

// Add organization-specific error types
export interface OrganizationApiError extends ApiError {
  organizationId?: string;
  membershipId?: string;
}

// Update session types to include organization context
export interface ExtendedSession {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
    image: string | null;
  };
  organizationId: string;
}







export interface DomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: (307 | 301 | 302 | 308) | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification: DomainVerification[];
}

export interface DomainConfigResponse {
  configuredBy?: ("CNAME" | "A" | "http") | null;
  acceptedChallenges?: ("dns-01" | "http-01")[];
  misconfigured: boolean;
}

export interface DomainVerificationResponse extends Omit<DomainResponse, 'verification'> {
  verification?: DomainVerification[];
}

/**
 * Authentication Token Types
 */
export interface AuthToken {
  agentId: string;
  exp: number;
  iat: number;
}

/**
 * Auth State Management
 */
export interface AuthState {
  authenticated: boolean;
  loading: boolean;
  error?: string;
}

/**
 * Type Guards
 */
export function isBaseStep(step: any): step is BaseStep {
  return (
    typeof step === 'object' &&
    step !== null &&
    typeof step.id === 'string' &&
    typeof step.title === 'string' &&
    typeof step.description === 'string' &&
    typeof step.completed === 'boolean' &&
    (step.completionTool === null ||
      ['email', 'memory', 'notesTaken', 'notion'].includes(step.completionTool))
  );
}

export function isSessionStep(step: any): step is SessionStep {
  return isBaseStep(step);
}

export function isStepProgress(progress: any): progress is StepProgress {
  return (
    typeof progress === 'object' &&
    progress !== null &&
    Array.isArray(progress.steps) &&
    progress.steps.every(isBaseStep)
  );
}

/**
 * Type Conversion Utilities
 */
export function convertToBaseStep(step: Partial<BaseStep>): BaseStep {
  return {
    id: step.id || crypto.randomUUID(),
    title: step.title || '',
    description: step.description || '',
    completed: step.completed || false,
    completionTool: step.completionTool || null,
    completedAt: step.completedAt,
  };
}

export function convertToSessionStep(step: BaseStep): SessionStep {
  return { ...step };
}