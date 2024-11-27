// types/agent.ts
export interface Site {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  subdomain: string | null;
  customDomain: string | null;
  font?: string;
  message404?: string | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  organizationId: string;
  organization: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
}

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