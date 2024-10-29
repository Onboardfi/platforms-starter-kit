export interface Site {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  font: string;
  subdomain: string | null;
  customDomain: string | null;
  message404: string | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}