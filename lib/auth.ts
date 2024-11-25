// lib/auth.ts

import { getServerSession, type NextAuthOptions, Session, User } from "next-auth";
import { getToken } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { Adapter } from "next-auth/adapters";
import db from "./db";
import { 
  accounts, 
  sessions, 
  users, 
  verificationTokens, 
  organizations, 
  organizationMemberships, 
  organizationInvites,
  SelectSite,       // Added import
  SelectAgent       // Added import
} from "./schema";
import { eq, and } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";

// Type declarations
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    needsOnboarding?: boolean;
    email?: string;
    user?: any;
    sub?: string;
    organizationId?: string | null;
    organizationRole?: 'owner' | 'admin' | 'member';
    hasInvite?: boolean;
    hasPendingInvites?: boolean;
    pendingInviteCount?: number;
    pendingInvites?: Array<{
      organizationId: string;
      role: 'owner' | 'admin' | 'member';
    }>;
    updatedAt?: number;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      username?: string | null;
      email: string;
      image: string | null;
    };
    organizationId?: string | null;
    needsOnboarding?: boolean;
    hasInvite?: boolean;
  }

  interface User {
    id: string;
    name?: string | null;
    username?: string | null;
    gh_username?: string;
    email: string;
    image?: string | null;
  }
}

// Constants
const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;
const SESSION_TOKEN_NAME = `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`;
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// Helper functions
async function getOrganizationMembership(userId: string) {
  const membership = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.userId, userId),
    with: {
      organization: true // Include full organization
    }
  });
  
  console.log('getOrganizationMembership - Membership:', membership);
  return membership;
}

async function updateUserMetadata(userId: string, metadata: any) {
  try {
    await db.update(users)
      .set({ metadata })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error('Failed to update user metadata:', error);
    return false;
  }
}

async function refreshOrganizationContext(userId: string) {
  const membership = await getOrganizationMembership(userId);
  
  if (membership?.organization) {
    return {
      organizationId: membership.organization.id,
      needsOnboarding: false,
      role: membership.role
    };
  }
  
  return {
    organizationId: null,
    needsOnboarding: true,
    role: null
  };
}

// Function to check if the user has any pending invites
async function checkUserInvites(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return false;

  const pendingInvites = await db.query.organizationInvites.findMany({
    where: and(
      eq(organizationInvites.email, user.email),
      eq(organizationInvites.status, 'pending')
    )
  });

  return pendingInvites.length > 0;
}

// Auth configuration
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET, // Ensure this is set
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID as string,
      clientSecret: process.env.AUTH_GITHUB_SECRET as string,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          gh_username: profile.login,
          email: profile.email || `${profile.login}@github.com`,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  
  pages: {
    signIn: `/login`,
    verifyRequest: `/login`,
    error: "/login",
  },
  
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  
  session: { 
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  
  cookies: {
    sessionToken: {
      name: SESSION_TOKEN_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: VERCEL_DEPLOYMENT ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          user.email = `${(profile as any).login}@github.com`;
        }
  
        // Fetch the existing user data to determine if the user is new
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
  
        // Determine if the user is new by comparing createdAt and updatedAt
        const isNewUser = existingUser
          ? existingUser.createdAt.getTime() === existingUser.updatedAt.getTime()
          : true;
  
        // Only set needsOnboarding to true for new users
        if (isNewUser) {
          const metadata = {
            needsOnboarding: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
  
          await updateUserMetadata(user.id, metadata);
        }
  
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Still allow sign in even if metadata update fails
      }
    },

    // Updated Session Callback
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub || token.id || '';  // Ensure user ID is set
        session.organizationId = token.organizationId;
        session.needsOnboarding = token.needsOnboarding;
        session.hasInvite = token.hasInvite;
      }
      
      console.log('Session Callback - Generated session:', {
        hasUser: !!session.user,
        userId: session.user?.id,
        organizationId: session.organizationId,
        needsOnboarding: session.needsOnboarding
      });

      return session;
    },

    // Updated JWT Callback
    async jwt({ token, user, trigger, session }) {
      console.log('JWT Callback - Input:', { trigger, hasUser: !!user, hasSession: !!session });
  
      try {
        // Case 1: Initial sign in or sign up
        if (user || trigger === 'signIn') {
          const userId = user?.id || token.sub;
          if (!userId) return token;
  
          console.log('JWT Callback - Initial sign in/up for user:', userId);
  
          const context = await refreshOrganizationContext(userId);
          const hasInvite = await checkUserInvites(userId);
          
          const userEmail = user?.email || token.email;
          if (!userEmail) return token;
  
          const pendingInvites = await db.query.organizationInvites.findMany({
            where: and(
              eq(organizationInvites.email, userEmail),
              eq(organizationInvites.status, 'pending')
            )
          });
  
          // Ensure these fields are always set
          return {
            ...token,
            id: userId,
            sub: userId,
            email: userEmail,
            name: user?.name || token.name,
            image: user?.image || token.picture,
            updatedAt: Date.now(),
            hasInvite,
            hasPendingInvites: pendingInvites.length > 0,
            pendingInviteCount: pendingInvites.length,
            ...context,
            pendingInvites: pendingInvites.map(invite => ({
              organizationId: invite.organizationId,
              role: invite.role
            }))
          };
        }
  
        // Case 2: Explicit session update
        if (trigger === "update" && session) {
          console.log('JWT Callback - Session update triggered');
          
          const updates: Record<string, any> = {}; // Type the updates object
  
          if (session.organizationId !== token.organizationId) {
            console.log('JWT Callback - Updating organization context:', {
              current: token.organizationId,
              new: session.organizationId
            });
  
            updates.organizationId = session.organizationId;
            updates.needsOnboarding = false;
          }
  
          if (session.user?.email && session.user.email !== token.email) {
            updates.email = session.user.email;
          }
  
          if (Object.keys(updates).length > 0) {
            Object.assign(token, updates, {
              updatedAt: Date.now()
            });
  
            console.log('JWT Callback - Token updated with:', updates);
          }
        }
  
        // Case 3: Periodic refresh
        const shouldRefresh = !token.updatedAt || Date.now() - token.updatedAt > 5 * 60 * 1000;
        if (shouldRefresh && token.sub) {
          console.log('JWT Callback - Performing periodic refresh');
  
          const [context, hasInvite] = await Promise.all([
            refreshOrganizationContext(token.sub),
            checkUserInvites(token.sub)
          ]);
  
          const hasChanges = 
            context.organizationId !== token.organizationId ||
            context.needsOnboarding !== token.needsOnboarding ||
            hasInvite !== token.hasInvite;
  
          if (hasChanges) {
            Object.assign(token, {
              ...context,
              hasInvite,
              updatedAt: Date.now()
            });
  
            console.log('JWT Callback - Token refreshed with:', {
              organizationId: context.organizationId,
              needsOnboarding: context.needsOnboarding,
              hasInvite
            });
          }
        }
  
        // Log final token state (with proper type checking for pendingInvites)
        console.log('JWT Callback - Final token:', {
          ...token,
          pendingInvites: token.pendingInvites ? 
            Array.isArray(token.pendingInvites) ? 
              `${token.pendingInvites.length} invites` : 
              'Invalid invites format' : 
            undefined
        });
  
        return token;
  
      } catch (error) {
        console.error('JWT Callback - Error:', error);
        return token;
      }
    },
  
   
    async redirect({ url, baseUrl }) {
      // Handle relative URLs
      if (url.startsWith('/')) {
        // Redirect based on organization status after sign in
        if (url.includes('callback')) {
          const token = await getToken({ req: { cookies: url } as any });
          if (token?.organizationId) {
            return `${baseUrl}/`;
          }
          return `${baseUrl}/onboarding`;
        }
        return `${baseUrl}${url}`;
      }
      
      // Allow same-origin URLs
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    }
  }
};

// Helper functions for getting session and auth middleware
export async function getSession() {
  return getServerSession(authOptions) as Promise<Session | null>;
}

/**
 * Higher-Order Function to wrap actions with site authentication
 */
export function withSiteAuth<
  Args extends [FormData, SelectSite, ...any[]], // Enforce FormData and SelectSite as first two arguments
  ReturnType
>(
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    console.log("withSiteAuth: Starting authentication");
    
    const session = await getServerSession(authOptions) as Session | null;
    
    console.log("withSiteAuth: Session retrieved", {
      hasSession: !!session,
      organizationId: session?.organizationId
    });

    if (!session?.organizationId) {
      console.error("withSiteAuth: Unauthorized - No organization context");
      throw new Error("Unauthorized or no organization context");
    }

    const [formData, site, ...rest] = args;

    // Debug log to help diagnose argument passing
    console.log("withSiteAuth: Arguments:", {
      hasFormData: formData instanceof FormData,
      site: {
        id: site?.id,
        organizationId: site?.organizationId,
        hasOrganization: !!site?.organization
      },
      additionalArgs: rest.length
    });

    // Enhanced validation for site object
    if (!site || typeof site !== 'object') {
      console.error("withSiteAuth: Site validation failed", { 
        receivedSite: site 
      });
      throw new Error("Invalid site object - Site is required");
    }

    if (!site.organizationId) {
      console.error("withSiteAuth: Missing organization ID", { 
        site 
      });
      throw new Error("Invalid site object - Missing organization ID");
    }

    if (site.organizationId !== session.organizationId) {
      console.error("withSiteAuth: Organization mismatch", {
        siteOrgId: site.organizationId,
        sessionOrgId: session.organizationId
      });
      throw new Error("Site does not belong to your organization");
    }

    try {
      // Call handler with properly typed arguments
      return await handler(...args);
    } catch (error) {
      console.error("withSiteAuth: Handler execution failed", error);
      throw error;
    }
  };
}
/**
 * Higher-Order Function to wrap actions with agent authentication
 */
export function withAgentAuth<
  Args extends any[],
  ReturnType
>(
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    console.log("withAgentAuth: Starting authentication");
    const session = await getSession();
    console.log("withAgentAuth: Session retrieved", session);

    if (!session?.organizationId) {
      console.error("withAgentAuth: Unauthorized - No organization context");
      throw new Error("Unauthorized or no organization context");
    }

    // Assuming the second argument is the agent
    const agent: SelectAgent & { site: SelectSite } = args[1];
    console.log("withAgentAuth: Agent organizationId", agent.site.organizationId);
    console.log("withAgentAuth: Session organizationId", session.organizationId);

    if (agent.site.organizationId !== session.organizationId) {
      console.error("withAgentAuth: Agent does not belong to your organization");
      throw new Error("Agent does not belong to your organization");
    }

    return handler(...args);
  };
}

/**
 * Higher-Order Function to wrap actions with organization authentication
 */
export function withOrgAuth<
  Args extends any[],
  ReturnType
>(
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    console.log("withOrgAuth: Starting authentication");
    const session = await getSession();
    console.log("withOrgAuth: Session retrieved", session);

    if (!session?.organizationId) {
      console.error("withOrgAuth: Unauthorized - No organization context");
      throw new Error("Unauthorized or no organization context");
    }

    return handler(...args);
  };
}

/**
 * Higher-Order Function to wrap actions with organization role authentication
 */
export function withOrgRoleAuth<
  Args extends any[],
  ReturnType
>(
  requiredRole: 'owner' | 'admin' | 'member',
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    console.log("withOrgRoleAuth: Starting role authentication");
    const session = await getSession();
    console.log("withOrgRoleAuth: Session retrieved", session);

    if (!session?.organizationId) {
      console.error("withOrgRoleAuth: Unauthorized - No organization context");
      throw new Error("Unauthorized or no organization context");
    }

    // Fetch the user's role in the organization
    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.organizationId, session.organizationId)
      )
    });

    if (!membership) {
      console.error("withOrgRoleAuth: User is not a member of the organization");
      throw new Error("User is not a member of the organization");
    }

    const userRole = membership.role;

    const rolesHierarchy = {
      'owner': 3,
      'admin': 2,
      'member': 1,
    };

    if (rolesHierarchy[userRole] < rolesHierarchy[requiredRole]) {
      console.error(`withOrgRoleAuth: Insufficient role. Required: ${requiredRole}, Found: ${userRole}`);
      throw new Error("Insufficient role");
    }

    return handler(...args);
  };
}

export default authOptions;
