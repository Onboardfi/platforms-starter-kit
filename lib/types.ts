// lib/types.ts

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
  completionTool: 'email' | 'memory' | 'notesTaken' | 'notion' | null;
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
  audioUrl?: string;
  transcript?: string;
}

export interface ToolCall {
  tool: string;
  input: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  timestamp: string;
  duration?: number;
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
  audioDurationSeconds?: number;  // Add this
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
  lastToolUse?: {
    tool: string;
    timestamp: string;
    success: boolean;
  };
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
  completionTool: 'email' | 'memory' | 'notesTaken' | 'notion' | null;
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

/**
 * Redis Cache Types
 */
export interface AgentState {
  agentId: string;
  onboardingType: 'internal' | 'external';
  lastActive: number;
  context: Record<string, any>;
}

export interface SessionState {
  sessionId: string;
  agentId: string;
  clientIdentifier?: string;
  currentStep: number;
  steps: SessionStep[];
  context: Record<string, any>;
  lastActive: number;
  metadata?: Record<string, any>;
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
export interface OnboardingSession {
  id: string;
  agentId: string;
  userId: string;
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

export type WebSocketEvent = SessionUpdateEvent | AgentStateEvent;

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