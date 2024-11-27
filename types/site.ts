
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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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

// Update SiteWithRelations to make organization required
export interface SiteWithRelations {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  font: string;
  subdomain: string | null;
  customDomain: string | null;
  message404: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  // Make organization required instead of optional
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
