// lib/auth.ts
import { 
  getServerSession, 
  type NextAuthOptions, 
  Session, 
  User,
  Account,     // Add this
  Profile,     // Add this
} from "next-auth";
import { 
  getToken, 
  JWT         // Just keep this
} from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { Adapter, AdapterUser } from "next-auth/adapters";


import db from "./db";
import { 
  accounts, 
  sessions, 
  users, 
  verificationTokens, 
  organizations, 
  organizationMemberships, 
  organizationInvites,
  sites,  // Add this import
  SelectSite,
  SelectAgent
} from "./schema";
import { eq, and } from "drizzle-orm";

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
    authType?: 'login' | 'signup';
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
    organizationRole?: 'owner' | 'admin' | 'member'; // Add this line
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
      organization: true
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

// lib/auth.ts - update refreshOrganizationContext
async function refreshOrganizationContext(userId: string) {
  try {
    console.log('Refreshing context for user:', userId);
    
    // First check organization membership
    const membership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId),
      with: {
        organization: true
      }
    });
    
    if (!membership?.organization) {
      console.log('No organization found for user');
      return {
        organizationId: null,
        needsOnboarding: true,
        role: null
      };
    }

    // Check if organization has any sites - Add logging
    const site = await db.query.sites.findFirst({
      where: eq(sites.organizationId, membership.organization.id)
    });

    console.log('Organization context refresh:', {
      organizationId: membership.organization.id,
      hasSite: !!site,
      role: membership.role
    });

    // Change the return to set needsOnboarding false if we have both org and site
    return {
      organizationId: membership.organization.id,
      needsOnboarding: !site, // This should be false if site exists
      role: membership.role,
      siteId: site?.id // Add siteId to the context
    };

  } catch (error) {
    console.error('Error refreshing organization context:', error);
    return {
      organizationId: null,
      needsOnboarding: true,
      role: null
    };
  }
}
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
  secret: process.env.NEXTAUTH_SECRET,
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
    async signIn({ user, account, profile, credentials }) {
      try {
        if (!user.email) {
          user.email = `${(profile as any).login}@github.com`;
        }
    
        // Check for existing organization membership first
        const membership = await db.query.organizationMemberships.findFirst({
          where: eq(organizationMemberships.userId, user.id),
          with: {
            organization: {
              with: {
                sites: true
              }
            }
          }
        });
    
        // Determine onboarding state based on organization and site existence
        const needsOnboarding = !membership?.organization || 
                              !membership.organization.sites?.length;
    
        const metadata = {
          needsOnboarding,
          lastLoginAt: new Date().toISOString(),
        };
    
        await updateUserMetadata(user.id, metadata);
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true;
      }
    },

    async session({ session, token }) {
      // If token is null or invalid, return minimal session
      if (!token || !token.sub) {
        return {
          expires: session.expires,
          user: { id: '', name: null, email: '', image: null }
        };
      }
    
      if (session.user && token) {
        session.user.id = token.sub || token.id || '';
        session.organizationId = token.organizationId;
        session.needsOnboarding = token.needsOnboarding;
        session.hasInvite = token.hasInvite;
      }
    
      return session;
    },

  

// Then update the jwt callback to include site information
async jwt({ token, user, trigger, session }: {
  token: JWT;
  user?: User | AdapterUser;
  trigger?: "signIn" | "signUp" | "update";
  session?: any;
}): Promise<JWT> {
  try {
    // CRITICAL: Always verify user exists in database first
    const userExists = await db.query.users.findFirst({
      where: eq(users.id, token.sub || ''),
    });

    if (!userExists) {
      return {} as JWT;
    }

    // Rest of your existing jwt callback logic
    if (user) {
      const userId = user.id || token.sub;
      if (!userId) return token;

      const context = await refreshOrganizationContext(userId);
      const hasInvite = await checkUserInvites(userId);

      // Add debug logging
      console.log('JWT Context Update:', context);

      return {
        ...token,
        id: userId,
        sub: userId,
        email: user.email,
        name: user.name,
        image: user.image,
        updatedAt: Date.now(),
        hasInvite,
        organizationId: context.organizationId,
        needsOnboarding: context.needsOnboarding, // This should now be false if site exists
        organizationRole: context.role,
        siteId: context.siteId // Include site ID in token
      } as JWT;
    }

    // Case 2: Session update (after onboarding steps)
    if (trigger === "update" && session) {
      const context = await refreshOrganizationContext(token.sub!);
      
      return {
        ...token,
        organizationId: context.organizationId,
        needsOnboarding: context.needsOnboarding,
        organizationRole: context.role,
        siteId: context.siteId,
        updatedAt: Date.now(),
      } as JWT;
    }

    return token;
  } catch (error) {
    console.error('JWT Callback - Error:', error);
    return {} as JWT;
  }
},
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        if (url.includes('callback')) {
          const token = await getToken({ req: { cookies: url } as any });
          
          
          if (!token?.organizationId) {
            return `${baseUrl}/onboarding`;
          }
          
          return `${baseUrl}/`;
        }
        return `${baseUrl}${url}`;
      }
      
      if (new URL(url).origin === baseUrl) {
        return url;
      }
    
      return baseUrl;
    }
  }
};

// Auth Middleware Functions
export async function getSession() {
  return getServerSession(authOptions) as Promise<Session | null>;
}

export function withAgentAuth<Args extends any[], ReturnType>(
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    const session = await getSession();
    if (!session?.organizationId) {
      throw new Error("Unauthorized or no organization context");
    }

    const agent = args[1] as SelectAgent & { site: SelectSite };
    if (!agent?.site?.organizationId) {
      throw new Error("Invalid agent - Missing organization context");
    }

    if (agent.site.organizationId !== session.organizationId) {
      throw new Error("Agent does not belong to your organization");
    }

    return handler(...args);
  };
}

export function withSiteAuth<
  Args extends [FormData, SelectSite, ...any[]],
  ReturnType
>(
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.organizationId) {
      throw new Error("Unauthorized or no organization context");
    }

    const [formData, site, ...rest] = args;

    if (!site?.organizationId) {
      throw new Error("Invalid site object - Missing organization ID");
    }

    if (site.organizationId !== session.organizationId) {
      throw new Error("Site does not belong to your organization");
    }

    return handler(...args);
  };
}

export function withOrgAuth<Args extends any[], ReturnType>(
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    const session = await getSession();
    if (!session?.organizationId) {
      throw new Error("Unauthorized or no organization context");
    }
    return handler(...args);
  };
}

export function withOrgRoleAuth<Args extends any[], ReturnType>(
  requiredRole: 'owner' | 'admin' | 'member',
  handler: (...args: Args) => Promise<ReturnType>
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args) => {
    const session = await getSession();
    if (!session?.organizationId) {
      throw new Error("Unauthorized or no organization context");
    }

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.userId, session.user.id),
        eq(organizationMemberships.organizationId, session.organizationId)
      )
    });

    if (!membership) {
      throw new Error("User is not a member of the organization");
    }

    const rolesHierarchy = { 'owner': 3, 'admin': 2, 'member': 1 };
    if (rolesHierarchy[membership.role] < rolesHierarchy[requiredRole]) {
      throw new Error("Insufficient role");
    }

    return handler(...args);
  };
}

export default authOptions;