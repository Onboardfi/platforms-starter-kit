// types/agent.ts

import { AgentSettings } from '@/lib/schema';

export interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  published: boolean;
  image?: string | null;
  imageBlurhash?: string | null;
  createdAt: Date;
  site: {
    subdomain: string | null;
  } | null;
  settings: AgentSettings; // Ensure this line is included
  // Add other properties as needed
}
