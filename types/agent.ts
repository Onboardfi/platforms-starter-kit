// types/agent.ts
import { SelectSite } from '@/lib/schema';

export type Site = SelectSite;

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
  settings: any;
  _count?: {
    sessions: number;
  };
}