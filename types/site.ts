// types/site.ts

export interface Site {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  font: string;
  subdomain: string | null;
  customDomain: string | null;
  message404: string | null;
  createdBy: string;  // Changed from userId to createdBy
  createdAt: Date;
  updatedAt: Date;
}

// Additional type for database operations if needed
export interface SiteWithRelations extends Site {
  organization?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
}