//Users/bobbygilbert/Documents/Github/platforms-starter-kit/lib/upstash.ts

import { Redis } from '@upstash/redis';
import { createId } from '@paralleldrive/cuid2';
import { eq, desc, and, lt, sql } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { users } from '@/lib/schema';
import db from '@/lib/db';

import {
  onboardingSessions,
  conversations,
  messages,
  usageLogs,
  organizations, // Add organizations table
  organizationMemberships // Add memberships table
} from '@/lib/schema';
import {
  AgentState,
  SessionState,
  BaseStep,
  SessionStep,
  StepProgress,
  MessageContent,
  MessageMetadata,
  ConversationMetadata,
  SelectMessage,
  SelectConversation,
  MessageType,
  MessageRole,
  ConversationStatus,
  ToolCall,
  ConversationWithSession,
} from '@/lib/types';

import {  count } from 'drizzle-orm';


// Add these imports if not already present
import { InferModel } from 'drizzle-orm';

interface CreateUsageLog {
  id: string;
  userId: string | null;
  sessionId: string | null;
  conversationId: string | null;
  messageId: string | null;
  durationSeconds: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  messageRole: 'user' | 'assistant';
  stripeCustomerId: string | null;
  reportingStatus: 'pending' | 'reported';
  organizationId: string;
  createdAt: Date; // Added
  // Optionally add other fields like stripeEventId if necessary
}



// Helper function to validate organization access
async function validateOrganizationAccess(
  organizationId: string, 
  userId?: string
): Promise<boolean> {
  if (!userId) return false;

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.organizationId, organizationId),
      eq(organizationMemberships.userId, userId)
    )
  });

  return !!membership;
}
type UsageLogMessageRole = 'user' | 'assistant';
function isValidUsageLogRole(role: MessageRole): role is UsageLogMessageRole {
  return role === 'user' || role === 'assistant';
}
// Helper function to get organization-specific Redis key
function getOrgScopedKey(prefix: string, id: string, organizationId: string): string {
  return `${ORGANIZATION_PREFIX}${organizationId}:${prefix}${id}`;
}

// Helper function to validate session exists
async function validateSession(sessionId: string): Promise<boolean> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
  });
  return !!session;
}

/**
 * Redis Client Configuration
 */
if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  throw new Error('Missing Upstash Redis configuration');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

/**
 * Constants
 */

// Update Redis key patterns to include organization context
const ORGANIZATION_PREFIX = 'org:';
const AGENT_STATE_PREFIX = 'agent:';
const SESSION_STATE_PREFIX = 'session:';
const CONVERSATION_PREFIX = 'conversation:';
const MESSAGE_PREFIX = 'message:';
const STATE_SUFFIX = ':state';
const DEFAULT_EXPIRY = 24 * 60 * 60;
const CLEANUP_THRESHOLD = 24 * 60 * 60 * 1000;

/**
 * Helper Functions and Default Values
 */
function ensureStepCompleteness(step: Partial<BaseStep>): BaseStep {
  return {
    id: step.id || createId(),
    title: step.title || '',
    description: step.description || '',
    completed: step.completed || false,
    completionTool: step.completionTool || null,
    completedAt: step.completedAt,
  };
}

function ensureMetadata<T extends Record<string, any>>(metadata: Record<string, any> | null, defaults: T): T {
  return {
    ...defaults,
    ...(metadata || {}),
  };
}
const defaultMessageMetadata: MessageMetadata = {
  clientId: '',
  deviceInfo: {},
  processingTime: 0,
  completionTokens: 0,
  promptTokens: 0,
  totalTokens: 0,
  toolCalls: [],
  isFinal: false,
  audioDurationSeconds: 0,  // Add this
};

const defaultConversationMetadata: ConversationMetadata = {
  agentVersion: '1.0',
  clientType: 'web',
  clientVersion: '1.0',
  sessionType: 'internal',
  completedSteps: [],
  toolsUsed: [],
  duration: 0,
  messageCount: 0,
};

/**
 * Agent State Management
 */
// Update setAgentState to include organization context
export async function setAgentState(
  agentId: string, 
  state: AgentState & { organizationId: string }
): Promise<void> {
  try {
    const key = getOrgScopedKey(AGENT_STATE_PREFIX, agentId, state.organizationId) + STATE_SUFFIX;
    await redis.set(key, state, { ex: DEFAULT_EXPIRY });
    
    // Set organization index
    await redis.sadd(`${ORGANIZATION_PREFIX}${state.organizationId}:agents`, agentId);
    
    console.log(`Agent state updated for ${agentId} in org ${state.organizationId}`);
  } catch (error) {
    console.error('Failed to set agent state:', error);
    throw new Error('Failed to update agent state');
  }
}

// Update getAgentState to be organization-aware
export async function getAgentState(
  agentId: string, 
  organizationId: string
): Promise<AgentState | null> {
  try {
    const key = getOrgScopedKey(AGENT_STATE_PREFIX, agentId, organizationId) + STATE_SUFFIX;
    return await redis.get(key);
  } catch (error) {
    console.error('Failed to get agent state:', error);
    throw new Error('Failed to retrieve agent state');
  }
}

/**
 * Session Management
 */
// Update session creation to include organization context
export async function createSession(
  agentId: string,
  data: Partial<SessionState> & {
    metadata: {
      organizationId: string;
      [key: string]: any;
    };
  }
): Promise<string> {
  try {
    const sessionId = createId();
    const { organizationId } = data.metadata;

    // Create session with complete steps and organization context
    const steps = data.steps?.map(ensureStepCompleteness) || [];

    const session: SessionState = {
      sessionId,
      agentId,
      currentStep: 0,
      steps,
      context: {},
      lastActive: Date.now(),
      metadata: data.metadata,
      // Use nullish coalescing to provide a default value
      clientIdentifier: data.clientIdentifier ?? `default-${sessionId}`
    };
   
    const key = getOrgScopedKey(SESSION_STATE_PREFIX, sessionId, organizationId) + STATE_SUFFIX;
    await redis.set(key, session, { ex: DEFAULT_EXPIRY });

    // Set organization index
    await redis.sadd(`${ORGANIZATION_PREFIX}${organizationId}:sessions`, sessionId);

    console.log(`Session created: ${sessionId} for agent: ${agentId} in org: ${organizationId}`);
    return sessionId;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new Error('Failed to create new session');
  }
}

// Update getSessionState to validate organization access
export async function getSessionState(sessionId: string): Promise<SessionState | null> {
  try {
    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId),
      columns: {
        organizationId: true
      }
    });

    if (!session) {
      console.log(`Session not found: ${sessionId}`);
      return null;
    }

    const key = getOrgScopedKey(SESSION_STATE_PREFIX, sessionId, session.organizationId) + STATE_SUFFIX;
    const state = await redis.get<SessionState>(key);

    if (!state) {
      console.log(`Session state not found in Redis: ${sessionId}`);
      return null;
    }

    // Ensure all steps are complete
    state.steps = state.steps.map(ensureStepCompleteness);

    return state;
  } catch (error) {
    console.error('Failed to get session state:', error);
    throw new Error('Failed to retrieve session state');
  }
}
export async function updateSessionState(
  sessionId: string,
  updates: Partial<SessionState>
): Promise<void> {
  try {
    const current = await getSessionState(sessionId);
    if (!current) throw new Error('Session not found');

    // Add runtime check to ensure metadata and organizationId are defined
    if (!current.metadata || !current.metadata.organizationId) {
      throw new Error('Session metadata is incomplete: organizationId missing');
    }

    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    const updated: SessionState = {
      ...current,
      ...updates,
      steps: updates.steps?.map(ensureStepCompleteness) || current.steps,
      metadata: {
        ...current.metadata,
        ...(updates.metadata || {}),
        organizationId: current.metadata.organizationId // Now TypeScript knows it's a string
      },
      lastActive: Date.now(),
    };

    await redis.set(key, updated, { ex: DEFAULT_EXPIRY });
    console.log(`Session updated: ${sessionId}`);
  } catch (error) {
    console.error('Failed to update session state:', error);
    throw new Error('Failed to update session state');
  }
}


export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    await redis.del(key);
    console.log(`Session deleted: ${sessionId}`);
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw new Error('Failed to delete session');
  }
}

/**
 * Session Discovery and Management
 */
export async function getActiveSessions(agentId: string): Promise<string[]> {
  try {
    const pattern = `${SESSION_STATE_PREFIX}*${STATE_SUFFIX}`;
    const keys = await redis.keys(pattern);

    const sessions = await Promise.all(
      keys.map(async (key) => {
        const session = await redis.get<SessionState>(key);
        return session && session.agentId === agentId ? session.sessionId : null;
      })
    );

    return sessions.filter((id): id is string => id !== null);
  } catch (error) {
    console.error('Failed to get active sessions:', error);
    throw new Error('Failed to retrieve active sessions');
  }
}

/**
 * Cleanup and Maintenance
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const pattern = `${SESSION_STATE_PREFIX}*${STATE_SUFFIX}`;
    const keys = await redis.keys(pattern);
    const now = Date.now();

    const expiredKeys = await Promise.all(
      keys.map(async (key) => {
        const session = await redis.get<SessionState>(key);
        return session && now - session.lastActive > CLEANUP_THRESHOLD ? key : null;
      })
    );

    const keysToDelete = expiredKeys.filter((key): key is string => key !== null);

    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map((key) => redis.del(key)));
      console.log(`Cleaned up ${keysToDelete.length} expired sessions`);
    }
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    throw new Error('Failed to cleanup expired sessions');
  }
}

/**
 * Persistence and Synchronization
 */
export async function syncSessionState(sessionId: string): Promise<void> {
  try {
    const state = await getSessionState(sessionId);
    if (!state) return;

    const stepProgress: StepProgress = {
      steps: state.steps.map(ensureStepCompleteness),
    };

    await db
      .update(onboardingSessions)
      .set({
        stepProgress,
        lastInteractionAt: new Date(state.lastActive),
        metadata: state.metadata || {},
        updatedAt: new Date(),
      })
      .where(eq(onboardingSessions.id, sessionId));

    console.log(`Synced session state to database: ${sessionId}`);
  } catch (error) {
    console.error('Failed to sync session state:', error);
    throw new Error('Failed to sync session with database');
  }
}

// Update initializeRedisFromPostgres to handle undefined clientIdentifier
export async function initializeRedisFromPostgres(sessionId: string): Promise<void> {
  try {
    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId),
    });

    if (!session) throw new Error('Session not found in database');

    // Transform steps ensuring completeness
    const transformedSteps: SessionStep[] = (session.stepProgress?.steps || []).map(
      ensureStepCompleteness
    );

    const redisState: SessionState = {
      sessionId: session.id,
      agentId: session.agentId || '',
      // Provide a default value if clientIdentifier is undefined
      clientIdentifier: session.clientIdentifier || `default-${session.id}`,
      currentStep: 0,
      steps: transformedSteps,
      context: {},
      lastActive: Date.now(),
      metadata: {
        ...(session.metadata || {}),
        organizationId: session.organizationId ?? ''
      },
    };

    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    await redis.set(key, redisState, { ex: DEFAULT_EXPIRY });

    console.log(`Initialized Redis state from database: ${sessionId}`);
  } catch (error) {
    console.error('Failed to initialize Redis from database:', error);
    throw new Error('Failed to initialize Redis state');
  }
}
/**
 * Conversation Management
 */

// Update conversation creation to include organization context
export async function createConversation(
  sessionId: string,
  metadata: Partial<ConversationMetadata & { organizationId: string }> = {}
): Promise<SelectConversation> {
  try {
    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId),
      columns: {
        organizationId: true
      }
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const finalMetadata = {
      ...defaultConversationMetadata,
      ...metadata,
      organizationId: session.organizationId
    };

    const [conversation] = await db
      .insert(conversations)
      .values({
        id: createId(),
        sessionId,
        status: 'active',
        metadata: finalMetadata,
        startedAt: new Date(),
        messageCount: 0,
      })
      .returning();

    const result: SelectConversation = {
      id: conversation.id,
      sessionId: conversation.sessionId!,
      status: conversation.status,
      metadata: finalMetadata,
      startedAt: conversation.startedAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: [],
      endedAt: conversation.endedAt || undefined,
      lastMessageAt: conversation.lastMessageAt || undefined,
      messageCount: conversation.messageCount || 0,
    };

    // Use organization-scoped Redis keys
    const redisKey = getOrgScopedKey(CONVERSATION_PREFIX, conversation.id, session.organizationId);
    await redis.set(
      redisKey,
      {
        metadata: finalMetadata,
        messageCount: 0,
        lastActive: Date.now(),
      },
      { ex: DEFAULT_EXPIRY }
    );

    // Add to organization's active conversations
    await redis.sadd(`${ORGANIZATION_PREFIX}${session.organizationId}:active_conversations`, conversation.id);

    return result;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    throw error instanceof Error ? error : new Error('Failed to create conversation');
  }
}


export async function getSessionConversations(
  sessionId: string,
  status?: ConversationStatus
): Promise<SelectConversation[]> {
  try {
    // First verify session exists
    const sessionExists = await validateSession(sessionId);
    if (!sessionExists) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const conditions = [eq(conversations.sessionId, sessionId)];
    if (status) {
      conditions.push(eq(conversations.status, status));
    }

    const results = await db.query.conversations.findMany({
      where: and(...conditions),
      orderBy: [desc(conversations.startedAt)],
    });

    // Transform results with guaranteed non-null sessionId
    return results.map((conv): SelectConversation => ({
      id: conv.id,
      sessionId: conv.sessionId!, // Assert non-null
      status: conv.status,
      metadata: ensureMetadata(conv.metadata, defaultConversationMetadata),
      startedAt: conv.startedAt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: [],
      endedAt: conv.endedAt || undefined,
      lastMessageAt: conv.lastMessageAt || undefined,
      messageCount: conv.messageCount || 0,
    }));
  } catch (error) {
    console.error('Failed to get session conversations:', error);
    throw error instanceof Error ? error : new Error('Failed to get session conversations');
  }
}

// Helper function to validate conversation belongs to session
export async function validateConversationSession(
  conversationId: string,
  sessionId: string
): Promise<boolean> {
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.sessionId, sessionId)
    ),
  });
  return !!conversation;
}

// Helper function to validate conversation exists with valid session
async function validateConversationWithSession(
  conversationId: string,
  sessionId?: string
): Promise<{
  conversation: SelectConversation;
  isValid: boolean;
}> {
  const conversation = await db.query.conversations.findFirst({
    where: sessionId
      ? and(
          eq(conversations.id, conversationId),
          eq(conversations.sessionId, sessionId)
        )
      : eq(conversations.id, conversationId),
  });

  if (!conversation || (sessionId && conversation.sessionId !== sessionId)) {
    return {
      isValid: false,
      conversation: null as unknown as SelectConversation, // Type assertion for compilation
    };
  }

  // Transform to SelectConversation with guaranteed non-null sessionId
  const result: SelectConversation = {
    id: conversation.id,
    sessionId: conversation.sessionId!, // Assert non-null
    status: conversation.status,
    metadata: ensureMetadata(conversation.metadata, defaultConversationMetadata),
    startedAt: conversation.startedAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: [],
    endedAt: conversation.endedAt || undefined,
    lastMessageAt: conversation.lastMessageAt || undefined,
    messageCount: conversation.messageCount || 0,
  };

  return {
    isValid: true,
    conversation: result,
  };
}

// Add a function to get conversation with session validation
export async function getConversationWithSession(
  conversationId: string,
  sessionId: string
): Promise<SelectConversation> {
  const { isValid, conversation } = await validateConversationWithSession(conversationId, sessionId);

  if (!isValid) {
    throw new Error(`Conversation ${conversationId} not found for session ${sessionId}`);
  }

  return conversation;
}

// Helper to ensure conversation belongs to session
export async function ensureConversationSession(
  conversationId: string,
  sessionId: string
): Promise<void> {
  const isValid = await validateConversationSession(conversationId, sessionId);
  if (!isValid) {
    throw new Error(`Conversation ${conversationId} does not belong to session ${sessionId}`);
  }
}

export async function completeConversation(
  conversationId: string,
  sessionId: string,
  metadata: Partial<ConversationMetadata> = {}
): Promise<void> {
  try {
    const { isValid, conversation } = await validateConversationWithSession(
      conversationId,
      sessionId
    );

    if (!isValid) {
      throw new Error(`Conversation ${conversationId} not found for session ${sessionId}`);
    }

    const finalMetadata = ensureMetadata(
      { ...conversation.metadata, ...metadata },
      defaultConversationMetadata
    );

    await db
      .update(conversations)
      .set({
        status: 'completed' as ConversationStatus,
        endedAt: new Date(),
        metadata: finalMetadata,
      })
      .where(eq(conversations.id, conversationId));

    await redis.srem('active_conversations', conversationId);

    console.log(`Completed conversation: ${conversationId} for session ${sessionId}`);
  } catch (error) {
    console.error('Failed to complete conversation:', error);
    throw error instanceof Error ? error : new Error('Failed to complete conversation');
  }
}

// Add function to check active conversations for a session
export async function hasActiveConversation(sessionId: string): Promise<boolean> {
  const activeConversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.sessionId, sessionId),
      eq(conversations.status, 'active')
    ),
  });

  return !!activeConversation;
}

export async function cleanupCompletedConversations(
  cutoffHours: number = 24
): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - cutoffHours);

    const oldConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.status, 'completed'),
        lt(conversations.endedAt, cutoffDate)
      ),
      columns: {
        id: true,
      },
    });

    await Promise.all(
      oldConversations.map(async (conv) => {
        const messageIds = await redis.zrange(
          `${CONVERSATION_PREFIX}${conv.id}:messages`,
          0,
          -1
        );

        await Promise.all([
          redis.del(`${CONVERSATION_PREFIX}${conv.id}`),
          redis.del(`${CONVERSATION_PREFIX}${conv.id}:messages`),
          ...messageIds.map((id) => redis.del(`${MESSAGE_PREFIX}${id}`)),
        ]);
      })
    );

    console.log(`Cleaned up ${oldConversations.length} old conversations`);
  } catch (error) {
    console.error('Failed to cleanup completed conversations:', error);
    throw new Error('Failed to cleanup completed conversations');
  }
}

export async function addMessage(
  messageData: {
    id: string;
    conversationId: string;
    type: MessageType;
    role: MessageRole;
    content: MessageContent;
    metadata?: Partial<MessageMetadata>;
    parentMessageId?: string;
    stepId?: string;
  }
): Promise<SelectMessage> {
  try {
    console.log('addMessage called with parameters:', {
      id: messageData.id,
      conversationId: messageData.conversationId,
      type: messageData.type,
      role: messageData.role,
      content: messageData.content,
      metadata: messageData.metadata,
      parentMessageId: messageData.parentMessageId,
      stepId: messageData.stepId
    });

    // Get conversation with complete session details
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, messageData.conversationId),
      with: {
        session: {
          columns: {
            organizationId: true,
            userId: true
          },
          with: {
            agent: {
              columns: {
                id: true,
                createdBy: true
              },
              with: {
                creator: { // Correctly reference 'creator'
                  columns: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    }) as ConversationWithSession; 
    

    if (!conversation?.session) {
      throw new Error('Conversation or session not found');
    }

    const organizationId = conversation.session.organizationId;
    const effectiveUserId = conversation.session.userId || 
    conversation.session.agent?.userId || 
    conversation.session.agent?.creator?.id;
    


    console.log('addMessage: Retrieved conversation:', {
      conversationId: conversation.id,
      organizationId,
      effectiveUserId
    });

    if (!effectiveUserId) {
      console.warn('addMessage: No user ID found for conversation:', messageData.conversationId);
    }

    // Use organization-scoped Redis key for message count
    const orderIndex = (
      await redis.incr(`${ORGANIZATION_PREFIX}${organizationId}:${CONVERSATION_PREFIX}${messageData.conversationId}:message_count`)
    ).toString();

    console.log(`addMessage: Retrieved orderIndex ${orderIndex} for conversation ${messageData.conversationId}`);

    // Check if message already exists
    const existingMessage = await db.query.messages.findFirst({
      where: eq(messages.id, messageData.id)
    });

    if (existingMessage) {
      console.log('addMessage: Message already exists:', messageData.id);
      return {
        ...existingMessage,
        metadata: {
          ...ensureMetadata(existingMessage.metadata, defaultMessageMetadata),
          organizationId
        },
        toolCalls: (existingMessage.toolCalls || []) as ToolCall[],
        stepId: existingMessage.stepId || undefined,
        parentMessageId: existingMessage.parentMessageId || undefined
      };
    }

    // Include organization ID in metadata
    const finalMetadata = {
      ...ensureMetadata(messageData.metadata || {}, defaultMessageMetadata),
      organizationId
    };

    // Create message with provided ID
    const [dbMessage] = await db
      .insert(messages)
      .values({
        id: messageData.id,
        conversationId: messageData.conversationId,
        type: messageData.type,
        role: messageData.role,
        content: messageData.content,
        metadata: finalMetadata,
        stepId: messageData.stepId,
        parentMessageId: messageData.parentMessageId,
        orderIndex,
        toolCalls: finalMetadata.toolCalls || [],
      })
      .returning();

    console.log('addMessage: Successfully inserted message:', dbMessage);

    const message: SelectMessage = {
      ...dbMessage,
      metadata: finalMetadata,
      toolCalls: finalMetadata.toolCalls || [],
      stepId: dbMessage.stepId || undefined,
      parentMessageId: dbMessage.parentMessageId || undefined,
    };

    // Log usage and handle Stripe billing
    if (messageData.role === 'assistant' && 
      (finalMetadata.audioDurationSeconds || finalMetadata.promptTokens || finalMetadata.completionTokens)) {
      try {
        console.log(`addMessage: Logging usage for message ${message.id}`);
        
        const user = effectiveUserId ? await db.query.users.findFirst({
          where: eq(users.id, effectiveUserId),
        }) : null;

        // Prepare usage log
        const usageLog = {
          userId: effectiveUserId,
          sessionId: conversation.session.id,
          conversationId: conversation.id,
          messageId: message.id,
          durationSeconds: Math.round(finalMetadata.audioDurationSeconds || 0),
          promptTokens: finalMetadata.promptTokens || 0,
          completionTokens: finalMetadata.completionTokens || 0,
          totalTokens: finalMetadata.totalTokens || 0,
          messageRole: messageData.role,
          stripeCustomerId: user?.stripeCustomerId || null,
          reportingStatus: 'pending' as const,
          organizationId
        };

        const [logResult] = await db
          .insert(usageLogs)
          .values(usageLog)
          .returning();

        // Handle Stripe billing
        if (user?.stripeCustomerId) {
          const timestamp = new Date().toISOString();
          
          // Create string metadata for Stripe
          const stripeMetadata = JSON.stringify({
            organizationId,
            messageId: message.id,
            sessionId: conversation.session.id
          });

          const billingPromises = [];

          if (finalMetadata.promptTokens) {
            billingPromises.push(
              stripe.billing.meterEvents.create({
                event_name: 'input_tokens',
                payload: {
                  stripe_customer_id: user.stripeCustomerId,
                  value: Math.ceil(finalMetadata.promptTokens / 1000).toString(),
                  timestamp,
                  metadata: stripeMetadata
                }
              })
            );
          }

          if (finalMetadata.completionTokens) {
            billingPromises.push(
              stripe.billing.meterEvents.create({
                event_name: 'output_tokens',
                payload: {
                  stripe_customer_id: user.stripeCustomerId,
                  value: Math.ceil(finalMetadata.completionTokens / 1000).toString(),
                  timestamp,
                  metadata: stripeMetadata
                }
              })
            );
          }

          if (finalMetadata.audioDurationSeconds) {
            billingPromises.push(
              stripe.billing.meterEvents.create({
                event_name: 'audio_duration',
                payload: {
                  stripe_customer_id: user.stripeCustomerId,
                  value: Math.round(finalMetadata.audioDurationSeconds).toString(),
                  timestamp,
                  metadata: stripeMetadata
                }
              })
            );
          }

          await Promise.all(billingPromises);
        }

        // Double log for agent user if different from session user
        if (conversation.session?.userId && 
            conversation.session.agent?.userId &&
            conversation.session.userId !== conversation.session.agent.userId) {
          await db
            .insert(usageLogs)
            .values({
              ...usageLog,
              id: createId(),
              userId: conversation.session.agent.userId
            })
            .returning();
        }

        console.log(`addMessage: Successfully logged usage for message ${message.id}:`, {
          duration: finalMetadata.audioDurationSeconds,
          promptTokens: finalMetadata.promptTokens,
          completionTokens: finalMetadata.completionTokens,
          userId: effectiveUserId,
          organizationId,
          logId: logResult.id
        });
      } catch (error) {
        console.error('addMessage: Failed to log usage:', error);
        console.error('addMessage: Usage logging context:', {
          userId: effectiveUserId,
          organizationId,
          sessionId: conversation.session.id,
          messageId: message.id,
          duration: finalMetadata.audioDurationSeconds,
          tokens: {
            prompt: finalMetadata.promptTokens,
            completion: finalMetadata.completionTokens
          }
        });
      }
    }

    // Update conversation
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: parseInt(orderIndex),
        metadata: {
          ...conversation.metadata,
          lastMessageId: message.id,
          organizationId
        },
      })
      .where(eq(conversations.id, messageData.conversationId));

    // Use organization-scoped Redis keys
    const messageKey = getOrgScopedKey(MESSAGE_PREFIX, message.id, organizationId);
    const conversationKey = getOrgScopedKey(CONVERSATION_PREFIX, messageData.conversationId, organizationId);

    // Update Redis state
    await Promise.all([
      redis.set(messageKey, message, { ex: DEFAULT_EXPIRY }),
      redis.zadd(`${conversationKey}:messages`, {
        score: parseInt(orderIndex),
        member: message.id,
      }),
      redis.set(
        conversationKey,
        {
          lastMessageId: message.id,
          messageCount: parseInt(orderIndex),
          lastActive: Date.now(),
          organizationId
        },
        { ex: DEFAULT_EXPIRY }
      ),
      // Add to organization's message index
      redis.sadd(`${ORGANIZATION_PREFIX}${organizationId}:messages`, message.id)
    ]);

    console.log('addMessage: Function completed successfully with message:', message);
    return message;
  } catch (error) {
    console.error('addMessage: Failed to add message:', error);
    throw error instanceof Error ? error : new Error('Failed to add message');
  }
}
// Function to create a usage log with type safety
async function createUsageLog(data: Omit<CreateUsageLog, 'id' | 'createdAt'>): Promise<CreateUsageLog> {
  const [logResult] = await db
    .insert(usageLogs)
    .values({
      id: createId(),
      userId: data.userId,
      sessionId: data.sessionId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      durationSeconds: data.durationSeconds,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      messageRole: data.messageRole,
      stripeCustomerId: data.stripeCustomerId,
      reportingStatus: data.reportingStatus,
      organizationId: data.organizationId
    })
    .returning();

  // Ensure createdAt is included and correctly typed
  return {
    ...logResult,
    createdAt: logResult.createdAt, // Ensure this matches the interface
  };
}





// Add new function to get organization statistics

export async function getOrganizationStats(organizationId: string): Promise<{
  activeSessionCount: number;
  totalMessageCount: number;
  activeConversationCount: number;
}> {
  try {
    const activeSessionCount = await redis.scard(`${ORGANIZATION_PREFIX}${organizationId}:sessions`);
    const activeConversationCount = await redis.scard(`${ORGANIZATION_PREFIX}${organizationId}:active_conversations`);

    // Perform raw SQL query with type specification
    const result = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) AS count
      FROM messages
      JOIN conversations ON messages.conversationId = conversations.id
      JOIN onboarding_sessions ON conversations.sessionId = onboardingSessions.id
      WHERE onboarding_sessions.organizationId = ${organizationId}
    `);

    // Parse the count as an integer
    const totalMessageCount = parseInt(result.rows[0].count, 10);

    return {
      activeSessionCount,
      activeConversationCount,
      totalMessageCount,
    };
  } catch (error) {
    console.error('Failed to get organization stats:', error);
    throw new Error('Failed to get organization stats');
  }
}
export async function updateMessage(
  messageId: string,
  updates: Partial<{
    content: MessageContent;
    metadata: Partial<MessageMetadata>;
    toolCalls: ToolCall[];
  }>
): Promise<SelectMessage> {
  try {
    const currentMessage = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!currentMessage) {
      throw new Error('Message not found');
    }

    const finalMetadata = ensureMetadata(
      { ...currentMessage.metadata, ...updates.metadata },
      defaultMessageMetadata
    );

    const [updatedMessage] = await db
      .update(messages)
      .set({
        ...updates,
        metadata: finalMetadata,
      })
      .where(eq(messages.id, messageId))
      .returning();

    const result: SelectMessage = {
      ...updatedMessage,
      metadata: finalMetadata,
      toolCalls: finalMetadata.toolCalls || [],
      stepId: updatedMessage.stepId || undefined,
      parentMessageId: updatedMessage.parentMessageId || undefined,
    };

    await redis.set(`${MESSAGE_PREFIX}${messageId}`, result, { ex: DEFAULT_EXPIRY });

    return result;
  } catch (error) {
    console.error('Failed to update message:', error);
    throw new Error('Failed to update message');
  }
}

export async function getConversationMessages(
  conversationId: string,
  options: {
    limit?: number;
    offset?: number;
    afterId?: string;
  } = {}
): Promise<SelectMessage[]> {
  try {
    const { limit = 50, offset = 0, afterId } = options;

    const conditions = [eq(messages.conversationId, conversationId)];

    if (afterId) {
      const afterMessage = await db.query.messages.findFirst({
        where: eq(messages.id, afterId),
      });
      if (afterMessage) {
        conditions.push(lt(messages.orderIndex, afterMessage.orderIndex));
      }
    }

    const results = await db.query.messages.findMany({
      where: and(...conditions),
      orderBy: [desc(messages.orderIndex)],
      limit,
      offset,
    });

    return results.map((msg) => ({
      ...msg,
      metadata: ensureMetadata(msg.metadata, defaultMessageMetadata),
      toolCalls: (msg.toolCalls || []).map((tc) => ({
        ...tc,
        timestamp: (tc as any).timestamp || new Date().toISOString(),
      })),
      stepId: msg.stepId || undefined,
      parentMessageId: msg.parentMessageId || undefined,
    }));
  } catch (error) {
    console.error('Failed to get conversation messages:', error);
    throw new Error('Failed to get conversation messages');
  }
}