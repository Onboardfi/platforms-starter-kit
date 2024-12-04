// lib/actions.ts

"use server";

import { getSession } from "@/lib/auth";
import { addDomainToVercel, removeDomainFromVercelProject, validDomainRegex } from "@/lib/domains";
import { getBlurDataURL } from "@/lib/utils";
import { put } from "@vercel/blob";
import { eq, InferModel, desc, asc, and, exists, } from "drizzle-orm";
import { 
  checkAgentLimits,
  incrementAgentCount,
  decrementAgentCount 
} from './usage-limits';
import { customAlphabet } from "nanoid";
import { revalidateTag } from "next/cache";
import { withSiteAuth, withAgentAuth } from "./auth";
import db from "./db";
import { Agent, Site } from '@/types/agent';
import { redirect } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";
import { 
  conversations, 
  messages, 
  agents, 
  SelectAgent, 
  SelectPost, 
  SelectSite, 
  posts, 
  sites, 
  users, 
  onboardingSessions, 
  SelectOnboardingSession,
} from './schema';
import { 
  AgentState, 
  SessionState, 
  UpdateAgentMetadataResponse, 
  Step, 
  AgentSettings, 
  MessageType, 
  MessageRole, 
  MessageContent, 
  MessageMetadata, 
  ConversationMetadata, 
  ConversationStatus, 
  ToolCall, 
  SelectMessage, 
  SelectConversation 
} from './types';
import { 
  redis, 
  setAgentState, 
  createSession, 
  getSessionState, 
  updateSessionState 
} from './upstash';
import { 
  addMessage, 
  getConversationMessages, 
  createConversation, 
  getSessionConversations 
} from './upstash';
import { sql } from "drizzle-orm";

// Import new tables for organization context
import { 
  organizations, 
  organizationMemberships, 
  SelectOrganization,
  SelectOrganizationMembership,
  SelectOrganizationWithRelations
} from './schema';
import type { Session } from 'next-auth';
import { 
  hasValidOrganization, 
  hasCompleteOrganizationContext, 
  isAuthenticated 
} from './utils/type-guards';

// Interfaces for responses

// Extend the built-in next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      username?: string | null;
      email: string;
      image: string | null;
    };
    organizationId?: string | null; // Make organizationId optional and nullable
    needsOnboarding?: boolean;
    hasInvite?: boolean;
  }
  
  interface User {
    id: string;
    name?: string | null;
    username?: string | null;
    email: string;
    image?: string | null;
    emailVerified?: Date | null;
  }
}

interface CreateSiteResponse {
  error?: string;
  id?: string;
}

interface CreateAgentResponse {
  error?: string;
  id?: string;
}

interface AuthError {
  error: string;
  code: 'UNAUTHORIZED' | 'NO_ORG_CONTEXT' | 'NOT_MEMBER';
}

// Nanoid configuration for unique ID generation
const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
);

// Types for relational data
type PostWithSite = typeof posts.$inferSelect & {
  site: SelectSite;
  creator: typeof users.$inferSelect;
  organization: SelectOrganization;
};

// Update AgentWithSite type
type AgentWithSite = typeof agents.$inferSelect & {
  site: SelectSite;
  creator: typeof users.$inferSelect;
};
// Update related types
type AgentWithRelations = typeof agents.$inferSelect & {
  site: SelectSite & {
    organization: SelectOrganization;
    creator: typeof users.$inferSelect;
  };
  creator: typeof users.$inferSelect;
};

// Helper function to verify organization membership
async function verifyOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, organizationId)
    )
  });
  return !!membership;
}

// ===== Site Management Functions =====

export const createSite = async (formData: FormData): Promise<CreateSiteResponse> => {
  const session = await getSession();
  if (!hasValidOrganization(session)) {
    return { error: "Unauthorized or no organization context" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const subdomain = formData.get("subdomain") as string;

  try {
    // Verify organization access
    const hasAccess = await verifyOrganizationAccess(session.user.id, session.organizationId);
    if (!hasAccess) {
      return { error: "Not a member of this organization" };
    }
    const result = await db
      .insert(sites)
      .values({
        id: createId(),
        name,
        description,
        subdomain,
        organizationId: session.organizationId,
        createdBy: session.user.id,
      })
      .returning();

    const site = result[0];
    
    revalidateTag(
      `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`
    );
    
    return { id: site.id };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "This subdomain is already taken" };
    }
    return { error: error.message || "Failed to create site" };
  }
};
export async function getSessionMessages(sessionId: string) {
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  return db.query.conversations.findMany({
    where: eq(conversations.sessionId, sessionId),
    with: {
      messages: {
        orderBy: [asc(messages.orderIndex)],
      },
    },
  }).then(conversations => 
    conversations.flatMap(conv => 
      conv.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: [{
          text: msg.content.text,
          transcript: msg.content.transcript,
          audioUrl: msg.content.audioUrl,
        }],
        metadata: msg.metadata,
        status: 'completed' as const
      }))
    )
  );
}
// Retrieve sites with agent counts, scoped to the user's organization
export async function getSitesWithAgentCount() {
  const session = await getSession();
  if (!session?.user.id || !session.organizationId) {
    redirect("/login");
    return [];
  }

  return await db.select({
    id: sites.id,
    name: sites.name,
    description: sites.description,
    logo: sites.logo,
    font: sites.font,
    image: sites.image,
    imageBlurhash: sites.imageBlurhash,
    subdomain: sites.subdomain,
    customDomain: sites.customDomain,
    message404: sites.message404,
    createdAt: sites.createdAt,
    updatedAt: sites.updatedAt,
    organizationId: sites.organizationId,
    createdBy: sites.createdBy,
    _count: {
      agents: sql<number>`count(${agents.id})::int`
    }
  })
  .from(sites)
  .leftJoin(agents, eq(sites.id, agents.siteId))
  .where(eq(sites.organizationId, session.organizationId))
  .groupBy(sites.id)
  .orderBy(desc(sites.createdAt));
}

// Update site properties, ensuring it belongs to the user's organization
export const updateSite = withSiteAuth(
  async (
    formData: FormData,
    site: SelectSite,
    key: string
  ): Promise<void> => {
    const session = await getSession();
    if (!session?.organizationId || site.organizationId !== session.organizationId) {
      redirect("/login");
      return;
    }

    const value = formData.get(key) as string;

    try {
      let response;

      if (key === "customDomain") {
        if (value.includes("vercel.pub")) {
          redirect(
            `/sites/${site.id}/settings?error=Cannot+use+vercel.pub+subdomain+as+your+custom+domain`
          );
          return;
        } else if (validDomainRegex.test(value)) {
          response = await db
            .update(sites)
            .set({
              customDomain: value,
            })
            .where(and(
              eq(sites.id, site.id),
              eq(sites.organizationId, session.organizationId)
            ))
            .returning()
            .then((res) => res[0]);

          await addDomainToVercel(value);
        } else if (value === "") {
          response = await db
            .update(sites)
            .set({
              customDomain: null,
            })
            .where(and(
              eq(sites.id, site.id),
              eq(sites.organizationId, session.organizationId)
            ))
            .returning()
            .then((res) => res[0]);
        }

        if (site.customDomain && site.customDomain !== value) {
          await removeDomainFromVercelProject(site.customDomain);
        }
      } else if (key === "image" || key === "logo") {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          redirect(
            `/sites/${site.id}/settings?error=Missing+BLOB_READ_WRITE_TOKEN+token`
          );
          return;
        }

        const file = formData.get(key) as File;
        const filename = `${nanoid()}.${file.type.split("/")[1]}`;

        const { url } = await put(filename, file, {
          access: "public",
        });

        const blurhash = key === "image" ? await getBlurDataURL(url) : null;

        response = await db
          .update(sites)
          .set({
            [key]: url,
            ...(blurhash && { imageBlurhash: blurhash }),
          })
          .where(and(
            eq(sites.id, site.id),
            eq(sites.organizationId, session.organizationId)
          ))
          .returning()
          .then((res) => res[0]);
      } else {
        response = await db
          .update(sites)
          .set({
            [key]: value,
          })
          .where(and(
            eq(sites.id, site.id),
            eq(sites.organizationId, session.organizationId)
          ))
          .returning()
          .then((res) => res[0]);
      }

      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`
      );
      site.customDomain && revalidateTag(`${site.customDomain}-metadata`);
    } catch (error: any) {
      if (error.code === "P2002") {
        redirect(
          `/sites/${site.id}/settings?error=This+${key}+is+already+taken`
        );
      } else {
        redirect(
          `/sites/${site.id}/settings?error=${encodeURIComponent(
            error.message
          )}`
        );
      }
      return;
    }
  }
);

// Delete a site, ensuring it belongs to the user's organization
export const deleteSite = withSiteAuth(
  async (_: FormData, site: SelectSite): Promise<void> => {
    const session = await getSession();
    if (!session?.organizationId || site.organizationId !== session.organizationId) {
      redirect("/login");
      return;
    }

    try {
      await db.delete(sites)
        .where(and(
          eq(sites.id, site.id),
          eq(sites.organizationId, session.organizationId)
        ))
        .returning();

      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`
      );
      site.customDomain && revalidateTag(`${site.customDomain}-metadata`);
    } catch (error: any) {
      redirect(
        `/sites/${site.id}/settings?error=${encodeURIComponent(
          error.message
        )}`
      );
      return;
    }
  }
);

async function getAgentWithRelations(agentId: string) {
  try {
    // Get the agent with site and organization in a single query
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

    if (!agent) {
      console.log('No agent found:', { agentId });
      return null;
    }

    if (!agent.siteId || !agent.site) {
      console.log('Agent found but missing site:', { agentId, siteId: agent.siteId });
      return null;
    }

    return {
      ...agent,
      site: {
        ...agent.site,
        organization: agent.site.organization,
        creator: agent.site.creator
      },
      creator: agent.creator || {
        id: agent.createdBy,
        name: null,
        username: null,
        gh_username: null,
        email: '',
        emailVerified: null,
        image: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } as AgentWithRelations;

  } catch (error) {
    console.error('Error in getAgentWithRelations:', error);
    throw error;
  }
}
function formatAgentResponse(
  agent: AgentWithRelations,
  fallbackOrganizationId: string,
  fallbackUserId: string
): SelectAgent {
  return {
    ...agent,
    site: agent.site || {
      id: '',
      name: null,
      description: null,
      logo: null,
      font: 'font-cal',
      image: null,
      imageBlurhash: null,
      subdomain: null,
      customDomain: null,
      message404: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationId: fallbackOrganizationId,
      createdBy: fallbackUserId,
      organization: null,
      creator: null
    },
    siteName: agent.site?.name ?? null,
    settings: agent.settings as AgentSettings,
    creator: agent.creator || {
      id: fallbackUserId,
      name: null,
      username: null,
      gh_username: null,
      email: '',
      emailVerified: null,
      image: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
}


export const getAgentById = async (agentId: string): Promise<SelectAgent | null> => {
  try {
    // Get the agent with full relations
    const agent = await getAgentWithRelations(agentId);
    
    // Log the found agent for debugging
    console.log('Found agent:', {
      agentId,
      found: !!agent,
      siteId: agent?.site?.id,
      orgId: agent?.site?.organizationId
    });

    if (!agent || !agent.site) {
      console.log(`No agent found with ID: ${agentId}`);
      return null;
    }

    // Format the response
    return {
      ...agent,
      siteName: agent.site.name,
      settings: agent.settings as AgentSettings,
      site: {
        ...agent.site,
        organization: agent.site.organization,
        creator: agent.site.creator
      }
    } as SelectAgent;

  } catch (error) {
    console.error('Error getting agent:', error);
    console.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      agentId
    });
    return null;
  }
}
// Updated createAgent function
export const createAgent = withSiteAuth(
  async (_: FormData, site: SelectSite): Promise<CreateAgentResponse> => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return { error: "Unauthorized or no organization context" };
    }

    try {
      // Check agent limits before creating
      const limits = await checkAgentLimits(session.organizationId);
      if (!limits.canCreate) {
        return { error: limits.error || "Agent limit reached" };
      }

      const result = await db
        .insert(agents)
        .values({
          id: createId(),
          siteId: site.id,
          createdBy: session.user.id,
          name: "New Onboard",
          description: "",
          slug: nanoid(),
          settings: {
            onboardingType: "external",
            allowMultipleSessions: false,
            headingText: "AI Onboarding Platform",
            tools: [],
            initialMessage: "",
            authentication: {
              enabled: false,
              message: "Please enter the password to access this internal onboarding"
            }
          } satisfies AgentSettings,
        })
        .returning();

      const agent = result[0];

      // Update the agent count in organization metadata
      await incrementAgentCount(session.organizationId);

      await setAgentState(agent.id, {
        agentId: agent.id,
        onboardingType: "external",
        lastActive: Date.now(),
        context: {},
        organizationId: site.organizationId
      });

      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
      );
      site.customDomain && revalidateTag(`${site.customDomain}-agents`);

      return { id: agent.id };
    } catch (error: any) {
      return { error: error.message || "Failed to create agent" };
    }
  }
);
// Update agent metadata, including handling authentication settings
export const updateAgentMetadata = withAgentAuth(
  async (
    formData: FormData,
    agent: SelectAgent & {
      site: SelectSite;
    },
    key: string
  ): Promise<UpdateAgentMetadataResponse> => {
    const session = await getSession();
    if (!session?.organizationId || agent.site.organizationId !== session.organizationId) {
      return {
        success: false,
        error: "Unauthorized or invalid organization context"
      };
    }

    try {
      let updatedData: Record<string, any> = {};

      if (key === "settings") {
        try {
          const newSettings = JSON.parse(formData.get(key) as string);
          
          // If authentication settings are being updated
          if (newSettings.authentication) {
            // Ensure we preserve the existing password if it's not being updated
            if (!newSettings.authentication.password && agent.settings.authentication?.password) {
              newSettings.authentication.password = agent.settings.authentication.password;
            }
          }

          updatedData = {
            settings: {
              ...agent.settings,
              ...newSettings,
              authentication: {
                ...agent.settings.authentication,
                ...newSettings.authentication
              }
            }
          };

          // Update Redis state if onboarding type changes
          if (newSettings.onboardingType && 
              newSettings.onboardingType !== agent.settings.onboardingType) {
            await redis.set(`agent:${agent.id}:state`, {
              agentId: agent.id,
              onboardingType: newSettings.onboardingType,
              lastActive: Date.now(),
              context: {},
              settings: updatedData.settings,
              organizationId: session.organizationId
            }, { ex: 24 * 60 * 60 });
          }
        } catch (e) {
          console.error('Settings update error:', e);
          return {
            success: false,
            error: "Invalid settings data"
          };
        }
      } else {
        const value = formData.get(key);
        // Handle boolean values properly
        updatedData = {
          [key]: key === "published" ? value === "true" : value
        };
      }

      // Update database using a subquery to verify site ownership
      const [updatedAgent] = await db
        .update(agents)
        .set({
          ...updatedData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agents.id, agent.id),
            exists(
              db.select({ id: sites.id })
                .from(sites)
                .where(
                  and(
                    eq(sites.id, agent.siteId as string),
                    eq(sites.organizationId, session.organizationId)
                  )
                )
            )
          )
        )
        .returning();

      if (!updatedAgent) {
        throw new Error("Failed to update agent - no rows affected");
      }

      // Cache the updated agent
      await redis.set(
        `agent:${agent.id}:metadata`,
        {
          ...updatedAgent,
          organizationId: session.organizationId
        },
        { ex: 3600 }
      );

      // Revalidate tags
      const tags = [
        `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`,
        `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${agent.slug}`
      ];

      if (agent.site?.customDomain) {
        tags.push(
          `${agent.site.customDomain}-agents`,
          `${agent.site.customDomain}-${agent.slug}`
        );
      }

      await Promise.all(tags.map(tag => revalidateTag(tag)));

      // Publish update event
      await redis.publish('agent-updates', {
        agentId: agent.id,
        type: 'metadata-update',
        timestamp: Date.now(),
        changes: updatedData
      });

      return { 
        success: true,
        data: updatedAgent 
      };

    } catch (error: any) {
      const errorResponse = {
        success: false,
        error: error.message || "An error occurred"
      };

      if (error.code === "P2002") {
        errorResponse.error = `This ${key} is already in use`;
      }

      console.error('Agent metadata update failed:', {
        agentId: agent.id,
        key,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return errorResponse;
    }
  }
);

// Update agent via API, ensuring it belongs to the user's organization
export const updateAgentAPI = async (
  data: Partial<SelectAgent> & { id: string },
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Organization context required" };
  }

  try {
    const agent = await db.query.agents.findFirst({
      where: and(
        eq(agents.id, data.id),
        exists(
          db.selectDistinct({ dummy: sql<number>`1` })
            .from(sites)
            .where(and(
              eq(sites.id, agents.siteId),
              eq(sites.organizationId, session.organizationId)
            ))
        )
      ),
      with: {
        site: true,
      },
    }) as AgentWithSite | undefined;

    if (!agent || agent.createdBy !== userId) {
      return { success: false, error: "Agent not found or unauthorized" };
    }

    await db
      .update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(agents.id, data.id),
        exists(
          db.selectDistinct({ dummy: sql<number>`1` })
            .from(sites)
            .where(and(
              eq(sites.id, agents.siteId),
              eq(sites.organizationId, session.organizationId)
            ))
        )
      ))
      .returning();

    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
    );
    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${agent.slug}`
    );

    if (agent.site?.customDomain) {
      revalidateTag(`${agent.site.customDomain}-agents`);
      revalidateTag(`${agent.site.customDomain}-${agent.slug}`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};





// Delete an agent, ensuring it belongs to the user's organization
export const deleteAgent = async (
  formData: FormData,
  agentId: string
): Promise<void> => {
  const session = await getSession();
  if (!session?.user.id || !session.organizationId) {
    redirect("/login");
    return;
  }

  // Get the agent with site to verify organization ownership
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      site: true
    }
  });

  if (!agent || !agent.site || agent.createdBy !== session.user.id) {
    redirect("/not-found");
    return;
  }

  if (agent.site.organizationId !== session.organizationId) {
    redirect("/not-found");
    return;
  }

  const confirm = formData.get("confirm") as string;
  if (confirm !== agent.name) {
    redirect(
      `/agent/${agentId}/settings?error=Agent+name+does+not+match`
    );
    return;
  }

  try {
    // Delete the agent with a subquery to verify organization ownership
    await db.delete(agents)
      .where(and(
        eq(agents.id, agentId),
        exists(
          db.select()
            .from(sites)
            .where(and(
              eq(sites.id, agents.siteId),
              eq(sites.organizationId, session.organizationId)
            ))
        )
      ))
      .returning();

    // Decrement the agent count
    await decrementAgentCount(session.organizationId);

    // Revalidate tags
    if (agent.site) {
      revalidateTag(
        `${agent.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
      );
      revalidateTag(
        `${agent.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${agent.slug}`
      );

      if (agent.site.customDomain) {
        revalidateTag(`${agent.site.customDomain}-agents`);
        revalidateTag(`${agent.site.customDomain}-${agent.slug}`);
      }
    }
  } catch (error: any) {
    redirect(
      `/agent/${agentId}/settings?error=${encodeURIComponent(
        error.message
      )}`
    );
    return;
  }
};

// ===== Post Management Functions =====

// Create a new post within a site, ensuring the site belongs to the user's organization
export const createPost = withSiteAuth(
  async (_: FormData, site: SelectSite): Promise<void> => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      redirect("/login");
      return;
    }

    // Verify site belongs to the organization
    if (site.organizationId !== session.organizationId) {
      redirect("/not-found");
      return;
    }

    try {
      await db
        .insert(posts)
        .values({
          id: createId(),
          slug: nanoid(),
          siteId: site.id,
          createdBy: session.user.id,
          organizationId: session.organizationId,
        })
        .returning();

      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`
      );
      site.customDomain && revalidateTag(`${site.customDomain}-posts`);
    } catch (error: any) {
      redirect(`/posts?error=${encodeURIComponent(error.message)}`);
      return;
    }
  }
);

// Update a post, ensuring it belongs to the user's organization
export const updatePost = async (
  data: Partial<SelectPost> & { id: string }
): Promise<void> => {
  const session = await getSession();
  if (!session?.user.id || !session.organizationId) {
    redirect("/login");
    return;
  }

  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, data.id),
      eq(posts.organizationId, session.organizationId)
    ),
    with: {
      site: true,
    },
  }) as PostWithSite | undefined;

  if (!post || post.createdBy !== session.user.id) {
    redirect("/not-found");
    return;
  }

  try {
    await db
      .update(posts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(posts.id, data.id),
        eq(posts.organizationId, session.organizationId)
      ))
      .returning();

    revalidateTag(
      `${post.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`
    );
    revalidateTag(
      `${post.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${post.slug}`
    );

    if (post.site?.customDomain) {
      revalidateTag(`${post.site.customDomain}-posts`);
      revalidateTag(`${post.site.customDomain}-${post.slug}`);
    }
  } catch (error: any) {
    redirect(
      `/post/${data.id}/settings?error=${encodeURIComponent(error.message)}`
    );
    return;
  }
};


// ===== User Management Functions =====

// Edit user details, ensuring it belongs to the user's organization
export const editUser = async (
  formData: FormData,
  _id: unknown,
  key: string
): Promise<void> => {
  const session = await getSession();
  if (!session?.user.id) {
    redirect("/login");
    return;
  }

  const value = formData.get(key) as string;

  try {
    await db
      .update(users)
      .set({
        [key]: value,
      })
      .where(eq(users.id, session.user.id))
      .returning();
  } catch (error: any) {
    if (error.code === "P2002") {
      redirect(`/profile?error=This+${key}+is+already+taken`);
    } else {
      redirect(`/profile?error=${encodeURIComponent(error.message)}`);
    }
    return;
  }
};

// lib/actions.ts
export async function getAgentsWithSessionCount(siteId: string, organizationId: string): Promise<SelectAgent[]> {
  try {
    // Get the site to verify organization context
    const site = await db.query.sites.findFirst({
      where: and(
        eq(sites.id, siteId),
        eq(sites.organizationId, organizationId)
      ),
      with: {
        organization: true,
        creator: true
      }
    });

    if (!site) {
      console.log('Site not found:', { siteId, organizationId });
      return [];
    }

    // Get all agents for the site without filtering by creator
    const agentsWithCreator = await db.query.agents.findMany({
      where: eq(agents.siteId, siteId),
      with: {
        site: {
          with: {
            organization: true,
            creator: true
          }
        },
        creator: true
      },
      orderBy: (agents, { desc }) => [desc(agents.createdAt)]
    });

    // For each agent, count their sessions
    const agentsWithCounts = await Promise.all(
      agentsWithCreator.map(async (agent) => {
        const sessionCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(onboardingSessions)
          .where(eq(onboardingSessions.agentId, agent.id))
          .then(result => result[0].count);

        // Make sure the creator is always properly typed
        const creator = agent.creator ? {
          id: agent.creator.id,
          name: agent.creator.name,
          username: agent.creator.username,
          gh_username: agent.creator.gh_username,
          email: agent.creator.email,
          emailVerified: agent.creator.emailVerified,
          image: agent.creator.image,
          stripeCustomerId: agent.creator.stripeCustomerId,
          stripeSubscriptionId: agent.creator.stripeSubscriptionId,
          metadata: agent.creator.metadata || {},
          createdAt: agent.creator.createdAt,
          updatedAt: agent.creator.updatedAt
        } : {
          id: agent.createdBy || '', // Ensure id is never null
          name: null,
          username: null,
          gh_username: null,
          email: '',
          emailVerified: null,
          image: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const formattedAgent: SelectAgent = {
          ...agent,
          site: agent.site ? {
            ...agent.site,
            organization: agent.site.organization,
            creator: agent.site.creator
          } : undefined,
          creator, // Use our properly typed creator
          siteName: agent.site?.name ?? null,
          settings: agent.settings as AgentSettings,
          _count: {
            sessions: sessionCount
          }
        };

        return formattedAgent;
      })
    );

    return agentsWithCounts;

  } catch (error) {
    console.error('Error fetching agents with session count:', error);
    return [];
  }
}
// ===== Onboarding Session Management Functions =====

// Create a new onboarding session, ensuring it belongs to the user's organization
export const createOnboardingSession = async (
  agentId: string,
  data: {
    name: string;
    clientIdentifier?: string;
    type: 'internal' | 'external';
    userId?: string;
    authState?: {
      isAuthenticated: boolean;
      isAnonymous: boolean;
      organizationId?: string;  // Add this
    };
  }
): Promise<string> => {
  // First try to get organization context from session
  const session = await getSession();
  // Then fallback to authState if session doesn't have it
  const organizationId = session?.organizationId || data.authState?.organizationId;
  
  if (!organizationId) {
    throw new Error('Organization context required');
  }

  // Get the agent to verify it exists and belongs to organization
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      site: true,
    },
  });

  if (!agent || !agent.site) {
    throw new Error('Agent not found or unauthorized');
  }

  // Verify the organization matches
  if (agent.site.organizationId !== organizationId) {
    throw new Error('Agent does not belong to this organization');
  }

  // Check if multiple sessions are allowed
  if (!agent.settings.allowMultipleSessions) {
    // Count existing active sessions
    const activeSessions = await db.query.onboardingSessions.findMany({
      where: and(
        eq(onboardingSessions.agentId, agentId),
        eq(onboardingSessions.status, 'active'),
        eq(onboardingSessions.organizationId, organizationId)
      )
    });

    if (activeSessions.length > 0) {
      throw new Error('Multiple sessions are not allowed. Please complete or delete the existing session first.');
    }
  }

  // Initialize steps from agent settings with default completion status
  const initialSteps = (agent.settings.steps || []).map(step => ({
    id: createId(),
    title: step.title,
    description: step.description,
    completionTool: step.completionTool,
    completed: false,
    completedAt: undefined
  }));

  const isAuthenticated = data.authState?.isAuthenticated || false;
  const isAnonymous = data.authState?.isAnonymous || true;

  try {
    let effectiveUserId = undefined;
    if (data.userId) {
      const userExists = await db.query.users.findFirst({
        where: eq(users.id, data.userId)
      });
      if (userExists) {
        effectiveUserId = data.userId;
      }
    }

    // Create session in PostgreSQL
    const sessionId = createId();
   // When creating the session in PostgreSQL
const [dbSession] = await db
.insert(onboardingSessions)
.values({
  id: sessionId,
  agentId,
  organizationId,
  userId: data.userId,
  name: data.name,
  clientIdentifier: data.clientIdentifier || `${data.userId || 'anon'}-${sessionId}`,
  type: data.type,
  status: 'active',
  stepProgress: { steps: initialSteps }, // Initialize with the steps!
  metadata: {
    isAnonymous: !data.userId,
    isAuthenticated: !!data.userId,
    organizationId,
    createdAt: new Date().toISOString()
  },
  startedAt: new Date(),
  lastInteractionAt: new Date(),
})
.returning();

    // Initialize Redis state
    await createSession(agentId, {
      clientIdentifier: data.clientIdentifier || `${effectiveUserId || 'anon'}-${sessionId}`,
      steps: initialSteps.map(step => ({
        ...step,
        completedAt: undefined
      })),
      metadata: {
        sessionId: dbSession.id,
        userId: effectiveUserId,
        type: data.type,
        isAnonymous: isAnonymous || !effectiveUserId,
        isAuthenticated: isAuthenticated && !!effectiveUserId,
        organizationId
      },
      currentStep: 0
    });

    console.log('Created new session with steps:', {
      sessionId: dbSession.id,
      agentId,
      steps: initialSteps,
      type: data.type,
      effectiveUserId,
      organizationId
    });

    return dbSession.id;

  } catch (error) {
    console.error('Failed to create session:', {
      error,
      agentId,
      userId: data.userId,
      type: data.type,
      organizationId
    });
    throw error;
  }
};
// Retrieve all onboarding sessions for an agent, ensuring they belong to the user's organization
export const getSessions = async (agentId: string, organizationId?: string): Promise<SelectOnboardingSession[]> => {
  try {
    // Get the agent to verify it exists and its organization
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: {
        site: true
      }
    });

    if (!agent || !agent.site) {
      console.warn('getSessions: Agent not found or missing site', { agentId });
      return [];
    }

    // Use the agent's organization if none provided
    const effectiveOrgId = organizationId || agent.site.organizationId;

    // Verify agent belongs to organization
    if (agent.site.organizationId !== effectiveOrgId) {
      console.warn('getSessions: Organization mismatch', {
        agentOrgId: agent.site.organizationId,
        providedOrgId: effectiveOrgId
      });
      return [];
    }

    return db.query.onboardingSessions.findMany({
      where: and(
        eq(onboardingSessions.agentId, agentId),
        eq(onboardingSessions.organizationId, effectiveOrgId)
      ),
      with: {
        conversations: {
          with: {
            messages: {
              orderBy: [asc(messages.orderIndex)],
            },
          },
          orderBy: [desc(conversations.startedAt)],
        },
      },
      orderBy: [desc(onboardingSessions.updatedAt)],
    });
  } catch (error) {
    console.error('getSessions error:', error);
    throw error;
  }
};
// Delete an onboarding session, ensuring it belongs to the user's organization
export const deleteSession = async (sessionId: string): Promise<void> => {
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  try {
    const onboardingSession = await db.query.onboardingSessions.findFirst({
      where: and(
        eq(onboardingSessions.id, sessionId),
        eq(onboardingSessions.organizationId, session.organizationId)
      ),
    });

    if (!onboardingSession) {
      throw new Error('Session not found or unauthorized');
    }

    // Delete related conversations and messages first
    await db.delete(conversations)
      .where(eq(conversations.sessionId, sessionId));

    // Delete the session from PostgreSQL
    await db.delete(onboardingSessions)
      .where(and(
        eq(onboardingSessions.id, sessionId),
        eq(onboardingSessions.organizationId, session.organizationId)
      ));

    // Clean up Redis state
    await redis.del(`session:${sessionId}:state`);

    console.log(`Successfully deleted session: ${sessionId}`);
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
};

// ===== Step Management Functions =====

// Mark a step as completed within an onboarding session
export const completeStep = async (
  sessionId: string,
  stepId: string
): Promise<void> => {
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  // Ensure the session belongs to the organization
  const onboardingSession = await db.query.onboardingSessions.findFirst({
    where: and(
      eq(onboardingSessions.id, sessionId),
      eq(onboardingSessions.organizationId, session.organizationId)
    ),
  });

  if (!onboardingSession) {
    throw new Error("Session not found or unauthorized");
  }

  // Update Redis state first (for real-time updates)
  const state = await getSessionState(sessionId);
  if (!state) throw new Error('Session not found');

  const updatedSteps = state.steps.map(step => 
    step.id === stepId 
      ? { ...step, completed: true, completedAt: new Date().toISOString() }
      : step
  );

  await updateSessionState(sessionId, { steps: updatedSteps });

  // Then update PostgreSQL
  await db
    .update(onboardingSessions)
    .set({
      stepProgress: { steps: updatedSteps },
      updatedAt: new Date()
    })
    .where(eq(onboardingSessions.id, sessionId));
};

// Update step completion status within an agent's onboarding session
export const updateStepCompletionStatus = async (
  agentId: string,
  stepIndex: number,
  completed: boolean
): Promise<UpdateAgentMetadataResponse> => {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Organization context required" };
  }

  const agent = await getAgentById(agentId);

  if (!agent || agent.site?.organizationId !== session.organizationId) {
    return { success: false, error: "Agent not found or unauthorized" };
  }

  if (!agent.settings.steps || stepIndex < 0 || stepIndex >= agent.settings.steps.length) {
    return { success: false, error: "Invalid step index" };
  }

  const updatedSteps = agent.settings.steps.map((step, index) => 
    index === stepIndex ? { ...step, completed } : step
  );

  try {
    await db
      .update(agents)
      .set({
        settings: {
          ...agent.settings,
          steps: updatedSteps,
        },
        updatedAt: new Date(),
      })
      .where(and(
        eq(agents.id, agentId),
        eq(sites.organizationId, session.organizationId)
      ))
      .returning();

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to update agent steps: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Update agent steps without authentication, ensuring it belongs to the user's organization
export const updateAgentStepsWithoutAuth = async (
  agentId: string,
  steps: Step[]
): Promise<UpdateAgentMetadataResponse> => {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Organization context required" };
  }

  try {
    const agent = await db.query.agents.findFirst({
      where: and(
        eq(agents.id, agentId),
        eq(sites.organizationId, session.organizationId)
      ),
      with: {
        site: true,
      },
    }) as AgentWithSite | undefined;

    if (!agent) {
      return { success: false, error: "Agent not found or unauthorized" };
    }

    const newSettings: AgentSettings = {
      ...agent.settings,
      steps,
      authentication: {
        ...agent.settings.authentication,
      }
    };

    await db
      .update(agents)
      .set({
        settings: newSettings,
        updatedAt: new Date(),
      })
      .where(and(
        eq(agents.id, agentId),
        eq(sites.organizationId, session.organizationId)
      ))
      .returning();

    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
    );
    if (agent.site?.customDomain) {
      revalidateTag(`${agent.site.customDomain}-agents`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating agent steps:", error);
    return { success: false, error: error.message || "Failed to update agent steps." };
  }
};


// ===== Organization Membership Verification =====

// (Already included in helper function `verifyOrganizationAccess`)

// ===== Re-exporting Functions =====

// ===== Organization Membership Verification =====
// (Already included in helper function `verifyOrganizationAccess`)
// ===== Re-exporting Functions =====
export { addMessage, getConversationMessages, createConversation, getSessionConversations, type CreateSiteResponse };

// ===== Logging Exports =====

console.log('Exported functions:', {
  createSite,
  getSitesWithAgentCount,
  updateSite,
  deleteSite,
  getAgentById,
  createAgent,
  updateAgentMetadata,
  updateAgentAPI,
  deleteAgent,
  createPost,
  updatePost,
  editUser,
  getAgentsWithSessionCount,
  createOnboardingSession,
  getSessions,
  deleteSession,
  completeStep,
  updateStepCompletionStatus,
  updateAgentStepsWithoutAuth,
  addMessage,
  getConversationMessages,
  createConversation,
  getSessionConversations
});
