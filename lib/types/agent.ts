// types/agent.ts

import { AgentSettings } from '@/lib/schema';

// Define the Site interface to match your schema
export interface Site {
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
  userId: string | null;
}

// Add the SessionCount interface
interface SessionCount {
  sessions: number;
}

// Define the Agent interface to match your schema and include all relationships
export interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  image: string | null;
  imageBlurhash: string | null;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
  siteId: string | null;
  userId: string | null;
  settings: AgentSettings;
  // Relationships and computed fields
  site: Site | null;
  siteName?: string | null;
  userName?: string | null;
  _count?: SessionCount;  // Add this line to include the session count

}

// Props interface for the AgentConsole component
export interface AgentConsoleProps {
  agent: Agent;
}

// Optional: Session type if you need it
export interface Session {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'abandoned';
  type: 'internal' | 'external';
  createdAt: string;
  lastInteractionAt?: string;
}

// Optional: Email type if you're using it
export interface DraftEmail {
  to: string;
  subject: string;
  body: string;
}