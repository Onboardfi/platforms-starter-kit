import { Redis } from '@upstash/redis';
import { createId } from '@paralleldrive/cuid2';
import { eq, desc, and, lt } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { 
  onboardingSessions, 
  conversations, 
  messages,
  usageLogs,
  users,
  organizations,
  organizationMemberships,
  SelectOrganization,
  SelectOrganizationMembership
} from '@/lib/schema';

// Core types for database state management
export interface AgentStateWithOrg {
  agentId: string;
  onboardingType: 'internal' | 'external';
  lastActive: number;
  context: Record<string, any>;
  organizationId: string;
}

export interface SessionStateWithOrg {
  sessionId: string;
  agentId: string;
  organizationId: string;
  userId?: string;
  currentStep: number;
  steps: Array<SessionStep>;
  context: Record<string, any>;
  lastActive: number;
  metadata?: Record<string, any>;
  clientIdentifier?: string;
}

export interface ConversationWithSession {
  id: string;
  sessionId: string;
  session: {
    id: string;
    organizationId: string;
    userId: string | null;
    agent: {
      id: string;
      userId: string | null;
      user?: {
        id: string;
      } | null;
    } | null;
    user?: {
      id: string;
    } | null;
  } | null;
}

export interface SelectConversationWithSession extends ConversationWithSession {
  status: ConversationStatus;
  metadata: ConversationMetadata;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  messages: SelectMessage[];
  endedAt?: Date;
  lastMessageAt?: Date;
  messageCount: number;
}

export interface ConversationMetadataWithOrg extends ConversationMetadata {
  organizationId: string;
}

// Redis client setup
if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  throw new Error('Missing Upstash Redis configuration');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Constants
const AGENT_STATE_PREFIX = 'agent:';
const SESSION_STATE_PREFIX = 'session:';
const CONVERSATION_PREFIX = 'conversation:';
const MESSAGE_PREFIX = 'message:';
const ORGANIZATION_PREFIX = 'org:';
const STATE_SUFFIX = ':state';
const MEMBER_SUFFIX = ':members';
const DEFAULT_EXPIRY = 24 * 60 * 60; // 24 hours
const CLEANUP_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Default metadata
const defaultMessageMetadata: MessageMetadata = {
  clientId: '',
  deviceInfo: {},
  processingTime: 0,
  completionTokens: 0,
  promptTokens: 0,
  totalTokens: 0,
  toolCalls: [],
  isFinal: false,
  audioDurationSeconds: 0,
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

// Helper functions
const ensureStepCompleteness = (step: Partial<BaseStep>): BaseStep => ({
  id: step.id || createId(),
  title: step.title || '',
  description: step.description || '',
  completed: step.completed || false,
  completionTool: step.completionTool || null,
  completedAt: step.completedAt,
});

const ensureMetadata = <T extends Record<string, any>>(
  metadata: Record<string, any> | null, 
  defaults: T
): T => ({
  ...defaults,
  ...(metadata || {}),
});

const safeArrayAdd = async (key: string, values: string[]): Promise<void> => {
  if (values.length > 0) {
    await redis.sadd(key, values as unknown as [string, ...string[]]);
  }
};

// Organization validation helpers
const validateOrganizationAccess = async (
  userId: string, 
  organizationId: string
): Promise<boolean> => {
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, organizationId)
    )
  });
  return !!membership;
};

const validateSessionOrganization = async (
  sessionId: string, 
  organizationId: string
): Promise<boolean> => {
  const session = await db.query.onboardingSessions.findFirst({
    where: and(
      eq(onboardingSessions.id, sessionId),
      eq(onboardingSessions.organizationId, organizationId)
    ),
  });
  return !!session;
};

/**
 * Agent State Management with Organization Context
 */
export const setAgentState = async (
  agentId: string, 
  state: AgentStateWithOrg
): Promise<void> => {
  try {
    const key = `${AGENT_STATE_PREFIX}${agentId}${STATE_SUFFIX}`;
    const orgKey = `${ORGANIZATION_PREFIX}${state.organizationId}:agents`;
    
    await Promise.all([
      redis.set(key, state, { ex: DEFAULT_EXPIRY }),
      redis.sadd(orgKey, agentId)
    ]);
    
    console.log(`Agent state updated for ${agentId} in organization ${state.organizationId}`);
  } catch (error) {
    console.error('Failed to set agent state:', error);
    throw new Error('Failed to update agent state');
  }
};

export const getAgentState = async (
  agentId: string
): Promise<AgentStateWithOrg | null> => {
  try {
    const key = `${AGENT_STATE_PREFIX}${agentId}${STATE_SUFFIX}`;
    return await redis.get<AgentStateWithOrg>(key);
  } catch (error) {
    console.error('Failed to get agent state:', error);
    throw new Error('Failed to retrieve agent state');
  }
};

/**
 * Organization Cache Management
 */
export const cleanupOrganizationData = async (
  organizationId: string
): Promise<void> => {
  try {
    const pattern = `${ORGANIZATION_PREFIX}${organizationId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Failed to cleanup organization data:', error);
    throw new Error('Failed to cleanup organization data');
  }
};

export const initializeOrganizationCache = async (
  organizationId: string
): Promise<void> => {
  try {
    const members = await db.query.organizationMemberships.findMany({
      where: eq(organizationMemberships.organizationId, organizationId)
    });
    
    const memberKey = `${ORGANIZATION_PREFIX}${organizationId}${MEMBER_SUFFIX}`;
    const memberIds = members.map(m => m.userId);
    await safeArrayAdd(memberKey, memberIds);
    
    const sessions = await db.query.onboardingSessions.findMany({
      where: and(
        eq(onboardingSessions.organizationId, organizationId),
        eq(onboardingSessions.status, 'active')
      )
    });
    
    const sessionKey = `${ORGANIZATION_PREFIX}${organizationId}:sessions`;
    const sessionIds = sessions.map(s => s.id);
    await safeArrayAdd(sessionKey, sessionIds);
  } catch (error) {
    console.error('Failed to initialize organization cache:', error);
    throw new Error('Failed to initialize organization cache');
  }
};

/**
 * Session Management with Organization Context
 */
export const createSession = async (
  agentId: string,
  data: Partial<SessionStateWithOrg>
): Promise<string> => {
  try {
    if (!data.organizationId) {
      throw new Error('Organization ID is required');
    }

    if (data.userId && !(await validateOrganizationAccess(data.userId, data.organizationId))) {
      throw new Error('User does not have access to the organization');
    }

    const sessionId = createId();
    const steps = data.steps?.map(ensureStepCompleteness) || [];

    const session: SessionStateWithOrg = {
      sessionId,
      agentId,
      organizationId: data.organizationId,
      userId: data.userId,
      currentStep: 0,
      steps,
      context: {},
      lastActive: Date.now(),
      metadata: data.metadata || {},
      clientIdentifier: data.clientIdentifier,
    };

    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    const orgKey = `${ORGANIZATION_PREFIX}${data.organizationId}:sessions`;
    
    await Promise.all([
      redis.set(key, session, { ex: DEFAULT_EXPIRY }),
      safeArrayAdd(orgKey, [sessionId])
    ]);

    return sessionId;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
};

export const getSessionState = async (
  sessionId: string
): Promise<SessionStateWithOrg | null> => {
  try {
    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    const session = await redis.get<SessionStateWithOrg>(key);

    if (!session) {
      console.log(`Session not found: ${sessionId}`);
      return null;
    }

    session.steps = session.steps.map(ensureStepCompleteness);
    return session;
  } catch (error) {
    console.error('Failed to get session state:', error);
    throw new Error('Failed to retrieve session state');
  }
};

export const updateSessionState = async (
  sessionId: string,
  updates: Partial<SessionStateWithOrg>
): Promise<void> => {
  try {
    const current = await getSessionState(sessionId);
    if (!current) throw new Error('Session not found');

    const steps = updates.steps?.map(ensureStepCompleteness) || current.steps;

    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    const updated: SessionStateWithOrg = {
      ...current,
      ...updates,
      steps,
      metadata: updates.metadata || current.metadata || {},
      lastActive: Date.now(),
    };

    await redis.set(key, updated, { ex: DEFAULT_EXPIRY });
  } catch (error) {
    console.error('Failed to update session state:', error);
    throw new Error('Failed to update session state');
  }
};

export const deleteSession = async (
  sessionId: string
): Promise<void> => {
  try {
    const session = await getSessionState(sessionId);
    if (!session) {
      console.warn(`Attempted to delete non-existent session: ${sessionId}`);
      return;
    }

    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    const orgKey = `${ORGANIZATION_PREFIX}${session.organizationId}:sessions`;
    
    await Promise.all([
      redis.del(key),
      redis.srem(orgKey, sessionId)
    ]);
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw new Error('Failed to delete session');
  }
};

export const getActiveSessions = async (
  agentId: string
): Promise<string[]> => {
  try {
    const pattern = `${SESSION_STATE_PREFIX}*${STATE_SUFFIX}`;
    const keys = await redis.keys(pattern);

    const sessions = await Promise.all(
      keys.map(async (key) => {
        const session = await redis.get<SessionStateWithOrg>(key);
        return session && session.agentId === agentId ? session.sessionId : null;
      })
    );

    return sessions.filter((id): id is string => id !== null);
  } catch (error) {
    console.error('Failed to get active sessions:', error);
    throw new Error('Failed to retrieve active sessions');
  }
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    const pattern = `${SESSION_STATE_PREFIX}*${STATE_SUFFIX}`;
    const keys = await redis.keys(pattern);
    const now = Date.now();

    const expiredKeys = await Promise.all(
      keys.map(async (key) => {
        const session = await redis.get<SessionStateWithOrg>(key);
        return session && now - session.lastActive > CLEANUP_THRESHOLD ? key : null;
      })
    );

    const keysToDelete = expiredKeys.filter((key): key is string => key !== null);

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(`Cleaned up ${keysToDelete.length} expired sessions`);
    }
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    throw new Error('Failed to cleanup expired sessions');
  }
};

export const syncSessionState = async (
  sessionId: string
): Promise<void> => {
  try {
    const state = await getSessionState(sessionId);
    if (!state) return;

    const stepProgress: StepProgress = {
      steps: state.steps.map(ensureStepCompleteness),
    };

    await db.update(onboardingSessions)
      .set({
        stepProgress,
        lastInteractionAt: new Date(state.lastActive),
        metadata: state.metadata || {},
        updatedAt: new Date(),
      })
      .where(eq(onboardingSessions.id, sessionId));
  } catch (error) {
    console.error('Failed to sync session state:', error);
    throw new Error('Failed to sync session with database');
  }
};

/**
 * Conversation Management with Organization Context
 */
const getDetailedConversation = async (
  conversationId: string
): Promise<ConversationWithSession | null> => {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      session: {
        columns: {
          id: true,
          organizationId: true,
          userId: true
        },
        with: {
          agent: {
            columns: {
              id: true,
              userId: true
            },
            with: {
              user: {
                columns: {
                  id: true
                }
              }
            }
          },
          user: {
            columns: {
              id: true
            }
          }
        }
      }
    }
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    sessionId: conversation.sessionId!,
    session: conversation.session
  };
};

const validateConversationWithSession = async (
  conversationId: string,
  sessionId?: string
): Promise<{
  conversation: SelectConversationWithSession;
  isValid: boolean;
}> => {
  const conversation = await db.query.conversations.findFirst({
    where: sessionId
      ? and(
          eq(conversations.id, conversationId),
          eq(conversations.sessionId, sessionId)
        )
      : eq(conversations.id, conversationId),
    with: {
      session: {
        columns: {
          id: true,
          organizationId: true,
          userId: true
        }
      }
    }
  });

  if (!conversation || (sessionId && conversation.sessionId !== sessionId)) {
    return {
      isValid: false,
      conversation: {
        id: '',
        sessionId: '',
        session: null,
        status: 'active',
        metadata: defaultConversationMetadata,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        messageCount: 0
      }
    };
  }

  return {
    isValid: true,
    conversation: {
      ...conversation,
      session: conversation.session,
      metadata: ensureMetadata(conversation.metadata, defaultConversationMetadata),
      messages: [],
      endedAt: conversation.endedAt || undefined,
      lastMessageAt: conversation.lastMessageAt || undefined,
      messageCount: conversation.messageCount || 0,
      status: conversation.status as ConversationStatus
    }
  };
};

export const createConversation = async (
  sessionId: string,
  metadata: Partial<ConversationMetadataWithOrg> = {}
): Promise<SelectConversation> => {
  try {
    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId)
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const finalMetadata = ensureMetadata(
      { ...metadata, organizationId: session.organizationId },
      defaultConversationMetadata
    );

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

    await Promise.all([
      redis.set(
        `${CONVERSATION_PREFIX}${conversation.id}`,
        {
          metadata: finalMetadata,
          messageCount: 0,
          lastActive: Date.now(),
        },
        { ex: DEFAULT_EXPIRY }
      ),
      redis.sadd('active_conversations', conversation.id)
    ]);

    return result;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    throw error instanceof Error ? error : new Error('Failed to create conversation');
  }
};

/**
 * Message Management with Organization-Level Billing and Usage Tracking
 */
export const addMessage = async (
  messageData: {
    id: string;
    conversationId: string;
    type: MessageType;
    role: MessageRole;
    content: MessageContent;
    metadata?: Partial<MessageMetadata>;
    parentMessageId?: string;
    stepId?: string;
    organizationId: string;
  }
): Promise<SelectMessage> => {
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

    // Validate organization context
    const detailedConversation = await getDetailedConversation(messageData.conversationId);

    if (!detailedConversation?.session?.organizationId) {
      throw new Error('Invalid organization context');
    }

    if (detailedConversation.session.organizationId !== messageData.organizationId) {
      throw new Error('Organization mismatch');
    }

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, messageData.organizationId)
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const effectiveUserId = detailedConversation.session?.userId || 
                          detailedConversation.session?.agent?.userId || 
                          detailedConversation.session?.agent?.user?.id;

    const finalMetadata = ensureMetadata(messageData.metadata || {}, defaultMessageMetadata);

    const orderIndex = (
      await redis.incr(`${CONVERSATION_PREFIX}${messageData.conversationId}:message_count`)
    ).toString();

    // Check for existing message
    const existingMessage = await db.query.messages.findFirst({
      where: eq(messages.id, messageData.id)
    });

    if (existingMessage) {
      return {
        ...existingMessage,
        metadata: ensureMetadata(existingMessage.metadata, defaultMessageMetadata),
        toolCalls: (existingMessage.toolCalls || []) as ToolCall[],
        stepId: existingMessage.stepId || undefined,
        parentMessageId: existingMessage.parentMessageId || undefined
      };
    }

    // Create new message
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

    const message: SelectMessage = {
      ...dbMessage,
      metadata: finalMetadata,
      toolCalls: finalMetadata.toolCalls || [],
      stepId: dbMessage.stepId || undefined,
      parentMessageId: dbMessage.parentMessageId || undefined,
    };

    // Handle organization-level billing and usage tracking
    if (messageData.role === 'assistant' && 
        (finalMetadata.audioDurationSeconds || finalMetadata.promptTokens || finalMetadata.completionTokens) &&
        organization.stripeCustomerId) {
      try {
        // Log usage
        const usageLog = {
          organizationId: messageData.organizationId,
          userId: effectiveUserId,
          sessionId: detailedConversation.sessionId,
          conversationId: detailedConversation.id,
          messageId: message.id,
          durationSeconds: Math.round(finalMetadata.audioDurationSeconds || 0),
          promptTokens: finalMetadata.promptTokens || 0,
          completionTokens: finalMetadata.completionTokens || 0,
          totalTokens: finalMetadata.totalTokens || 0,
          messageRole: messageData.role,
          stripeCustomerId: organization.stripeCustomerId,
          reportingStatus: 'pending' as const
        };

        await db.insert(usageLogs).values(usageLog);

        // Send billing events to Stripe
        if (finalMetadata.promptTokens) {
          await stripe.billing.meterEvents.create({
            event_name: 'input_tokens',
            payload: {
              stripe_customer_id: organization.stripeCustomerId,
              value: Math.ceil(finalMetadata.promptTokens / 1000).toString(),
              timestamp: new Date().toISOString()
            }
          });
        }

        if (finalMetadata.completionTokens) {
          await stripe.billing.meterEvents.create({
            event_name: 'output_tokens',
            payload: {
              stripe_customer_id: organization.stripeCustomerId,
              value: Math.ceil(finalMetadata.completionTokens / 1000).toString(),
              timestamp: new Date().toISOString()
            }
          });
        }

        if (finalMetadata.audioDurationSeconds) {
          await stripe.billing.meterEvents.create({
            event_name: 'audio_duration',
            payload: {
              stripe_customer_id: organization.stripeCustomerId,
              value: Math.round(finalMetadata.audioDurationSeconds).toString(),
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error('Failed to log usage:', error);
      }
    }

    // Update conversation
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: parseInt(orderIndex),
        metadata: {
          ...detailedConversation.session,
          lastMessageId: message.id,
        },
      })
      .where(eq(conversations.id, messageData.conversationId));

    // Update Redis state
    const messageKey = `${MESSAGE_PREFIX}${message.id}`;
    const conversationKey = `${CONVERSATION_PREFIX}${messageData.conversationId}`;

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
        },
        { ex: DEFAULT_EXPIRY }
      ),
    ]);

    return message;
  } catch (error) {
    console.error('Failed to add message:', error);
    throw error instanceof Error ? error : new Error('Failed to add message');
  }
};

export const updateMessage = async (
  messageId: string,
  updates: Partial<{
    content: MessageContent;
    metadata: Partial<MessageMetadata>;
    toolCalls: ToolCall[];
  }>
): Promise<SelectMessage> => {
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
};

export const getConversationMessages = async (
  conversationId: string,
  options: {
    limit?: number;
    offset?: number;
    afterId?: string;
  } = {}
): Promise<SelectMessage[]> => {
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
};

export const getSessionConversations = async (
  sessionId: string,
  status?: ConversationStatus
): Promise<SelectConversation[]> => {
  try {
    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId),
    });

    if (!session) {
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

    return results.map((conv): SelectConversation => ({
      id: conv.id,
      sessionId: conv.sessionId!,
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
};

export const completeConversation = async (
  conversationId: string,
  sessionId: string,
  metadata: Partial<ConversationMetadata> = {}
): Promise<void> => {
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
  } catch (error) {
    console.error('Failed to complete conversation:', error);
    throw error instanceof Error ? error : new Error('Failed to complete conversation');
  }
};

// Export all types and interfaces
export type {
  AgentStateWithOrg,
  SessionStateWithOrg,
  ConversationWithSession,
  SelectConversationWithSession,
  ConversationMetadataWithOrg
};