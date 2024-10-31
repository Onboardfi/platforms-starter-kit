// lib/upstash.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export interface AgentState {
  agentId: string;
  onboardingType: 'internal' | 'external';
  lastActive: number;
  context: Record<string, any>;
}

export async function setAgentState(agentId: string, state: AgentState): Promise<void> {
  const key = `agent:${agentId}:state`;
  await redis.set(key, state, { ex: 24 * 60 * 60 }); // 24 hour expiration
}

export async function getAgentState(agentId: string): Promise<AgentState | null> {
  const key = `agent:${agentId}:state`;
  return redis.get(key);
}