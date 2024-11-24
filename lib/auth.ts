// lib/auth.ts
// lib/auth.ts
import { getServerSession, type NextAuthOptions, Session, User } from "next-auth";
import { getToken } from "next-auth/jwt"; // Add this import
import GitHubProvider from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { Adapter } from "next-auth/adapters";
import { createId } from '@paralleldrive/cuid2';
import db from "./db";
import { 
  accounts, 
  sessions, 
  users, 
  verificationTokens, 
  organizations, 
  organizationMemberships, 
  sites, 
  agents, 
  posts 
} from "./schema";
import { eq, and } from "drizzle-orm";
import { SelectAgent, SelectSite, SelectOrganization } from './schema';
import { UpdateAgentMetadataResponse } from './types';
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
      organization: true // Changed to include full organization
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

// Auth configuration
export const authOptions: NextAuthOptions = {
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
      if (!user.email) {
        user.email = `${(profile as any).login}@github.com`;
      }

      const context = await refreshOrganizationContext(user.id);
      const metadata = {
        needsOnboarding: !context.organizationId, // Only set needsOnboarding if no org
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      await updateUserMetadata(user.id, metadata);
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      console.log('JWT Callback - Input:', { trigger, hasUser: !!user, hasSession: !!session });
      
      // Initial sign in or sign up
      if (user || trigger === 'signIn') {
        const userId = user?.id || token.sub;
        if (!userId) return token;

        const context = await refreshOrganizationContext(userId);
        return {
          ...token,
          id: userId,
          sub: userId,
          email: user?.email || token.email,
          updatedAt: Date.now(),
          ...context
        };
      }

      // Handle explicit session updates
      if (trigger === "update" && session) {
        // Only update organization context if it's different
        if (session.organizationId !== token.organizationId) {
          token.organizationId = session.organizationId;
          token.needsOnboarding = false;
          token.updatedAt = Date.now();
        }
        
        if (session.user?.email) {
          token.email = session.user.email;
        }
      }

      // Periodic refresh (every 5 minutes)
      const shouldRefresh = !token.updatedAt || Date.now() - token.updatedAt > 5 * 60 * 1000;
      if (shouldRefresh && token.sub) {
        console.log('JWT Callback - Refreshing organization context');
        const context = await refreshOrganizationContext(token.sub);
        Object.assign(token, context, { updatedAt: Date.now() });
      }

      console.log('JWT Callback - Final token:', token);
      return token;
    },

    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.email = token.email || session.user.email;
      }

      session.organizationId = token.organizationId;
      session.needsOnboarding = token.needsOnboarding;

      console.log('Session Callback - Session:', session);
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle relative URLs
      if (url.startsWith('/')) {
        // Redirect based on organization status after sign in
        if (url.includes('callback')) {
          const token = await getToken({ req: { cookies: url } as any });
          if (token?.organizationId) {
            return `${baseUrl}/app/dashboard`;
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
export function getSession() {
  return getServerSession(authOptions) as Promise<Session | null>;
}

// Auth middleware helpers
export function withSiteAuth(action: any) {
  return async (formData: FormData | null, siteId: string, key: string | null) => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return { error: "Not authenticated or no organization context" };
    }

    const site = await db.query.sites.findFirst({
      where: and(
        eq(sites.id, siteId),
        eq(sites.organizationId, session.organizationId)
      ),
      with: {
        organization: true,
        creator: true
      }
    });

    if (!site) return { error: "Site not found or unauthorized" };
    return action(formData, site, key);
  };
}

export function withAgentAuth(
  action: (
    formData: FormData,
    agent: SelectAgent & { site: SelectSite },
    key: string
  ) => Promise<UpdateAgentMetadataResponse>
) {
  return async (formData: FormData, agentId: string, key: string) => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return { success: false, error: "Not authenticated or no organization context" };
    }

    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: {
        site: {
          with: {
            organization: true,
            creator: true
          }
        },
        creator: true
      }
    });

    if (!agent?.site || agent.site.organizationId !== session.organizationId) {
      return { success: false, error: "Agent not found or unauthorized" };
    }

    return action(formData, agent as SelectAgent & { site: SelectSite }, key);
  };
}

export function withOrgAuth(action: any) {
  return async (formData: FormData | null, organizationId: string, key: string | null) => {
    const session = await getSession();
    if (!session?.user.id) return { error: "Not authenticated" };

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, session.user.id)
      )
    });

    if (!membership) return { error: "Not a member of this organization" };
    return action(formData, organizationId, key);
  };
}

export function withOrgRoleAuth(requiredRole: 'owner' | 'admin' | 'member') {
  return function(action: any) {
    return async (formData: FormData | null, organizationId: string, key: string | null) => {
      const session = await getSession();
      if (!session?.user.id) return { error: "Not authenticated" };

      const membership = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, session.user.id)
        )
      });

      if (!membership) return { error: "Not a member of this organization" };

      const hasRequiredRole = 
        requiredRole === 'member' ? true :
        requiredRole === 'admin' ? ['admin', 'owner'].includes(membership.role) :
        membership.role === 'owner';

      if (!hasRequiredRole) return { error: `Requires ${requiredRole} role` };
      return action(formData, organizationId, key);
    };
  };
}

export default authOptions;