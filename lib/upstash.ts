// lib/upstash.ts

import { Redis } from '@upstash/redis';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { onboardingSessions } from '@/lib/schema';
import { 
  AgentState, 
  SessionState,
  BaseStep,
  OnboardingSession,
  SessionStep,
  StepProgress,
  convertToBaseStep,
  convertToSessionStep
} from '@/lib/types';

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
const AGENT_STATE_PREFIX = 'agent:';
const SESSION_STATE_PREFIX = 'session:';
const STATE_SUFFIX = ':state';
const DEFAULT_EXPIRY = 24 * 60 * 60; // 24 hours
const CLEANUP_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Helper Functions
 */
function ensureStepCompleteness(step: Partial<BaseStep>): BaseStep {
  return {
    id: step.id || createId(),
    title: step.title || '',
    description: step.description || '',
    completed: step.completed || false,
    completionTool: step.completionTool || null,
    completedAt: step.completedAt
  };
}

/**
 * Agent State Management
 */
export async function setAgentState(agentId: string, state: AgentState): Promise<void> {
  try {
    const key = `${AGENT_STATE_PREFIX}${agentId}${STATE_SUFFIX}`;
    await redis.set(key, state, { ex: DEFAULT_EXPIRY });
    console.log(`Agent state updated for ${agentId}`);
  } catch (error) {
    console.error('Failed to set agent state:', error);
    throw new Error('Failed to update agent state');
  }
}

export async function getAgentState(agentId: string): Promise<AgentState | null> {
  try {
    const key = `${AGENT_STATE_PREFIX}${agentId}${STATE_SUFFIX}`;
    return await redis.get(key);
  } catch (error) {
    console.error('Failed to get agent state:', error);
    throw new Error('Failed to retrieve agent state');
  }
}

/**
 * Session Management
 */
export async function createSession(
  agentId: string,
  data: Partial<SessionState>
): Promise<string> {
  try {
    const sessionId = createId();
    
    // Create session with complete steps
    const steps = data.steps?.map(step => ensureStepCompleteness(step)) || [];

    const session: SessionState = {
      sessionId,
      agentId,
      currentStep: 0,
      steps,
      context: {},
      lastActive: Date.now(),
      metadata: data.metadata || {},
      clientIdentifier: data.clientIdentifier
    };

    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    await redis.set(key, session, { ex: DEFAULT_EXPIRY });
    
    console.log(`Session created: ${sessionId} for agent: ${agentId}`);
    return sessionId;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new Error('Failed to create new session');
  }
}

export async function getSessionState(sessionId: string): Promise<SessionState | null> {
  try {
    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    const session = await redis.get<SessionState>(key);
    
    if (!session) {
      console.log(`Session not found: ${sessionId}`);
      return null;
    }
    
    // Ensure all steps are complete
    session.steps = session.steps.map(step => ensureStepCompleteness(step));
    
    return session;
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

    // Update with complete steps
    const steps = updates.steps?.map(step => ensureStepCompleteness(step)) || current.steps;

    const key = `${SESSION_STATE_PREFIX}${sessionId}${STATE_SUFFIX}`;
    const updated: SessionState = { 
      ...current, 
      ...updates,
      steps,
      metadata: updates.metadata || current.metadata || {},
      lastActive: Date.now() 
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
        return session && (now - session.lastActive > CLEANUP_THRESHOLD) ? key : null;
      })
    );

    const keysToDelete = expiredKeys.filter((key): key is string => key !== null);
    
    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(key => redis.del(key)));
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
      steps: state.steps.map(step => ensureStepCompleteness(step))
    };

    await db
      .update(onboardingSessions)
      .set({
        stepProgress,
        lastInteractionAt: new Date(state.lastActive),
        metadata: state.metadata || {},
        updatedAt: new Date()
      })
      .where(eq(onboardingSessions.id, sessionId));

    console.log(`Synced session state to database: ${sessionId}`);
  } catch (error) {
    console.error('Failed to sync session state:', error);
    throw new Error('Failed to sync session with database');
  }
}

export async function initializeRedisFromPostgres(sessionId: string): Promise<void> {
  try {
    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId)
    });

    if (!session) throw new Error('Session not found in database');

    // Transform steps ensuring completeness
    const transformedSteps: SessionStep[] = (session.stepProgress?.steps || [])
      .map(step => ensureStepCompleteness(step));

    const redisState: SessionState = {
      sessionId: session.id,
      agentId: session.agentId || '',
      clientIdentifier: session.clientIdentifier || undefined,
      currentStep: 0,
      steps: transformedSteps,
      context: {},
      lastActive: Date.now(),
      metadata: session.metadata || {}
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
 * Export the redis instance for use in other parts of the application
 */
export default redis;