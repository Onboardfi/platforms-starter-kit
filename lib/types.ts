// lib/types.ts

/** 
 * **Step Interface**
 * Represents a single step in an agent's onboarding process.
 */

export interface Step {
  title: string;
  description: string;
  completionTool: "email" | "memory" | "notesTaken" | "notion" | null;
  completed: boolean;
}

export interface AgentSettings {
  headingText?: string;
  tools?: string[];
  initialMessage?: string;
  steps?: Step[];
}

export interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  userId: string | null;
  siteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
  settings: AgentSettings;
}
export interface UpdateAgentMetadataResponse {
  success: boolean;
  error?: string;
}

/** 
 * **Agent Interface**
 * Represents the structure of an agent within the system.
 */


/** 
 * **Domain Related Interfaces**
 * Represent responses from Vercel's Domain APIs.
 */

export type DomainVerificationStatusProps =
  | "Valid Configuration"
  | "Invalid Configuration"
  | "Pending Verification"
  | "Domain Not Found"
  | "Unknown Error";

/** 
 * Represents the response structure from Vercel's Get a Project Domain API.
 * Reference: https://vercel.com/docs/rest-api/endpoints#get-a-project-domain
 */
export interface DomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: (307 | 301 | 302 | 308) | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

/** 
 * Represents the response structure from Vercel's Get a Domain's Configuration API.
 * Reference: https://vercel.com/docs/rest-api/endpoints#get-a-domain-s-configuration
 */
export interface DomainConfigResponse {
  configuredBy?: ("CNAME" | "A" | "http") | null;
  acceptedChallenges?: ("dns-01" | "http-01")[];
  misconfigured: boolean;
}

/** 
 * Represents the response structure from Vercel's Verify Project Domain API.
 * Reference: https://vercel.com/docs/rest-api/endpoints#verify-project-domain
 */
export interface DomainVerificationResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: (307 | 301 | 302 | 308) | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}
