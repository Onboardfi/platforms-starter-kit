// types/site.ts

export interface Site {
    id: string;
    name: string;
    description?: string | null;
    subdomain: string;
    customDomain?: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null;
    imageBlurhash?: string | null;
    // Include other properties if necessary
  }
  