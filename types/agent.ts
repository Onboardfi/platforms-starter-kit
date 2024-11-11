//Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/types/agent.ts

import { AgentSettings } from '@/lib/schema';

export interface Site {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  subdomain: string | null;
  customDomain?: string | null;
}
// /types/agent.ts
export interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  published: boolean;
  image: string | null;
  imageBlurhash: string | null;
  createdAt: Date;
  site: Site | null;
  settings: AgentSettings;
  _count?: {
    sessions: number;
  };
}