// types/agent.ts

import { AgentSettings } from '@/lib/schema';

// Define the Site interface first
export interface Site {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  subdomain: string | null;
  customDomain?: string | null;
}

export interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  published: boolean;
  image: string | null; // Remove optional ? since it should always be present, even if null
  imageBlurhash: string | null; // Remove optional ? since it should always be present, even if null
  createdAt: Date;
  site: Site | null; // Use the Site interface instead of inline type
  settings: AgentSettings;
}