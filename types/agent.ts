// types/agent.ts

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
  // Add other properties as needed
}
