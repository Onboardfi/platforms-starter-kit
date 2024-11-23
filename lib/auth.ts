import { getServerSession, type NextAuthOptions, Session, User } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import db from "./db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { Adapter } from "next-auth/adapters";
import { accounts, sessions, users, verificationTokens, organizations, organizationMemberships, sites, agents, posts } from "./schema";
import { eq, and } from "drizzle-orm";
import { SelectAgent, SelectSite, SelectOrganization } from './schema';
import { UpdateAgentMetadataResponse } from './types';
import { createId } from '@paralleldrive/cuid2';

// Extend the built-in session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      username?: string | null;
      email: string;
      image: string | null;
    };
    organizationId: string;
  }

  interface User {
    username?: string | null; // Add '| null' here

    gh_username?: string;
  }
}

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

// Helper to get user's active organization
async function getUserActiveOrganization(userId: string): Promise<SelectOrganization | null> {
  const membership = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.userId, userId),
    with: {
      organization: true
    }
  });

  if (membership) {
    return membership.organization;
  }

  const defaultOrg = await db
    .insert(organizations)
    .values({
      id: createId(),
      name: "My Organization",
      slug: `org-${createId()}`,
      createdBy: userId,
    })
    .returning()
    .then(res => res[0]);

  await db.insert(organizationMemberships).values({
    id: createId(),
    organizationId: defaultOrg.id,
    userId: userId,
    role: 'owner'
  });

  return defaultOrg;
}

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
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: VERCEL_DEPLOYMENT
          ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
          : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.user = user;
        const organization = await getUserActiveOrganization(user.id);
        if (organization) {
          token.organizationId = organization.id;
        }
      }

      if (trigger === "update" && session?.organizationId) {
        token.organizationId = session.organizationId;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token?.sub) {
        session.user.id = token.sub;
        session.user.username = (token.user as any)?.username || (token.user as any)?.gh_username;
        session.organizationId = token.organizationId as string;
      }
      return session;
    },
    signIn: async ({ user, account, profile }) => {
      if (account?.provider === "github") {
        user.email = user.email || `${(profile as any).login}@github.com`;
      }
      return true;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions) as Promise<Session | null>;
}

export function withAgentAuth(
  action: (
    formData: FormData,
    agent: SelectAgent & { site: SelectSite },
    key: string
  ) => Promise<UpdateAgentMetadataResponse>
) {
  return async (
    formData: FormData,
    agentId: string,
    key: string
  ): Promise<UpdateAgentMetadataResponse> => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return {
        success: false,
        error: "Not authenticated or no organization context"
      };
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

    if (!agent || !agent.site || agent.site.organizationId !== session.organizationId) {
      return {
        success: false,
        error: "Agent not found or unauthorized"
      };
    }

    return action(formData, agent as SelectAgent & { site: SelectSite }, key);
  };
}

export function withSiteAuth(action: any) {
  return async (
    formData: FormData | null,
    siteId: string,
    key: string | null,
  ) => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return {
        error: "Not authenticated or no organization context",
      };
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

    if (!site) {
      return {
        error: "Site not found or unauthorized",
      };
    }

    return action(formData, site, key);
  };
}

export function withPostAuth(action: any) {
  return async (
    formData: FormData | null,
    postId: string,
    key: string | null,
  ) => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return {
        error: "Not authenticated or no organization context",
      };
    }

    const post = await db.query.posts.findFirst({
      where: and(
        eq(posts.id, postId),
        eq(posts.organizationId, session.organizationId)
      ),
      with: {
        site: {
          with: {
            organization: true,
            creator: true
          }
        },
        creator: true,
        organization: true
      }
    });

    if (!post) {
      return {
        error: "Post not found or unauthorized",
      };
    }

    return action(formData, post, key);
  };
}

export function withOrgAuth(action: any) {
  return async (
    formData: FormData | null,
    organizationId: string,
    key: string | null,
  ) => {
    const session = await getSession();
    if (!session?.user.id) {
      return {
        error: "Not authenticated",
      };
    }

    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, session.user.id)
      )
    });

    if (!membership) {
      return {
        error: "Not a member of this organization",
      };
    }

    return action(formData, organizationId, key);
  };
}

export async function hasOrgRole(
  userId: string,
  organizationId: string,
  requiredRole: 'owner' | 'admin' | 'member'
): Promise<boolean> {
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, organizationId)
    )
  });

  if (!membership) return false;

  switch (requiredRole) {
    case 'member':
      return true;
    case 'admin':
      return membership.role === 'admin' || membership.role === 'owner';
    case 'owner':
      return membership.role === 'owner';
  }
}

export function withOrgRoleAuth(requiredRole: 'owner' | 'admin' | 'member') {
  return function(action: any) {
    return async (
      formData: FormData | null,
      organizationId: string,
      key: string | null,
    ) => {
      const session = await getSession();
      if (!session?.user.id) {
        return {
          error: "Not authenticated",
        };
      }

      const hasRole = await hasOrgRole(session.user.id, organizationId, requiredRole);
      if (!hasRole) {
        return {
          error: `Requires ${requiredRole} role`,
        };
      }

      return action(formData, organizationId, key);
    };
  };
}