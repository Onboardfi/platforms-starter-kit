//Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/lib/actions.ts

"use server";

import { getSession } from "@/lib/auth";
import { addDomainToVercel, removeDomainFromVercelProject, validDomainRegex } from "@/lib/domains";
import { getBlurDataURL } from "@/lib/utils";
import { put } from "@vercel/blob";
import { eq, InferModel, desc, asc, and } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { revalidateTag } from "next/cache";
import { withPostAuth, withSiteAuth, withAgentAuth } from "./auth";
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
// Update the organization-related imports
import { 
  organizations, 
  organizationMemberships, 
  SelectOrganization,
  SelectOrganizationMembership,
  SelectOrganizationWithRelations
} from './schema';
import type { Session } from 'next-auth';
// Define the ExtendedSession type properly

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
    organizationId: string;
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

// Create a new site within an organization
export const createSite = async (formData: FormData): Promise<CreateSiteResponse> => {
  const session = await getSession();
  if (!session?.user.id || !session.organizationId) {
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

// ===== Agent Management Functions =====


async function getAgentWithRelations(agentId: string, organizationId: string) {
  return await db.query.agents.findFirst({
    where: and(
      eq(agents.id, agentId),
      eq(sites.organizationId, organizationId)
    ),
    with: {
      site: {
        with: {
          organization: true,
          creator: true
        }
      },
      creator: true
    }
  }) as AgentWithRelations;
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
      email: '',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
}

// Replace your existing getAgentById with this version
export const getAgentById = async (agentId: string): Promise<SelectAgent | null> => {
  const session = await getSession();
  if (!session?.user.id || !session.organizationId) {
    return null;
  }

  const agent = await getAgentWithRelations(agentId, session.organizationId);
  if (!agent) return null;

  return formatAgentResponse(agent, session.organizationId, session.user.id);
};
// Create a new agent within a site, ensuring the site belongs to the user's organization
export const createAgent = withSiteAuth(
  async (_: FormData, site: SelectSite): Promise<CreateAgentResponse> => {

    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return { error: "Unauthorized or no organization context" };
    }

    // Verify the site belongs to the organization
    if (site.organizationId !== session.organizationId) {
      return { error: "Site does not belong to your organization" };
    }

    try {
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

      await setAgentState(agent.id, {
        agentId: agent.id,
        onboardingType: "external",
        lastActive: Date.now(),
        context: {},
        organizationId: site.organizationId // Add this line to fix the AgentStateWithOrg error
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
        const value = formData.get(key) as string;
        updatedData = { [key]: value };
      }

      // Update database
      const updatedAgent = await db
        .update(agents)
        .set({
          ...updatedData,
          updatedAt: new Date(),
        })
        .where(and(
          eq(agents.id, agent.id),
          eq(sites.organizationId, session.organizationId)
        ))
        .returning()
        .then(res => res[0]);

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

  const agent = await db.query.agents.findFirst({
    where: and(
      eq(agents.id, data.id),
      eq(sites.organizationId, session.organizationId)
    ),
    with: {
      site: true,
    },
  }) as AgentWithSite | undefined;

  if (!agent || agent.createdBy !== userId) {
    return { success: false, error: "Agent not found or unauthorized" };
  }

  try {
    await db
      .update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(agents.id, data.id),
        eq(sites.organizationId, session.organizationId)
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

  const agent = await db.query.agents.findFirst({
    where: and(
      eq(agents.id, agentId),
      eq(sites.organizationId, session.organizationId)
    ),
    with: {
      site: true,
    },
  }) as AgentWithSite | undefined;

  if (!agent || agent.createdBy !== session.user.id) {
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
    await db.delete(agents)
      .where(and(
        eq(agents.id, agentId),
        eq(sites.organizationId, session.organizationId)
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

// Delete a post, ensuring it belongs to the user's organization
export const deletePost = withPostAuth(
  async (_: FormData, post: SelectPost): Promise<void> => {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      redirect("/login");
      return;
    }

    const postWithSite = await db.query.posts.findFirst({
      where: and(
        eq(posts.id, post.id),
        eq(posts.organizationId, session.organizationId)
      ),
      with: {
        site: true,
      },
    }) as PostWithSite | undefined;

    if (!postWithSite || postWithSite.createdBy !== session.user.id) {
      redirect("/not-found");
      return;
    }

    try {
      await db.delete(posts)
        .where(and(
          eq(posts.id, post.id),
          eq(posts.organizationId, session.organizationId)
        ))
        .returning();

      revalidateTag(
        `${postWithSite.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`
      );
      revalidateTag(
        `${postWithSite.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${postWithSite.slug}`
      );

      if (postWithSite.site?.customDomain) {
        revalidateTag(`${postWithSite.site.customDomain}-posts`);
        revalidateTag(`${postWithSite.site.customDomain}-${postWithSite.slug}`);
      }
    } catch (error: any) {
      redirect(
        `/post/${post.id}/settings?error=${encodeURIComponent(
          error.message
        )}`
      );
      return;
    }
  }
);

// Update post metadata, ensuring it belongs to the user's organization
export const updatePostMetadata = withPostAuth(
  async (
    formData: FormData,
    post: SelectPost & {
      site: SelectSite;
    },
    key: string
  ): Promise<void> => {
    const session = await getSession();
    if (!session?.organizationId) {
      redirect("/login");
      return;
    }

    const value = formData.get(key) as string;

    try {
      if (key === "image") {
        const file = formData.get("image") as File;
        const filename = `${nanoid()}.${file.type.split("/")[1]}`;

        const { url } = await put(filename, file, {
          access: "public",
        });

        const blurhash = await getBlurDataURL(url);
        await db
          .update(posts)
          .set({
            image: url,
            imageBlurhash: blurhash,
          })
          .where(and(
            eq(posts.id, post.id),
            eq(posts.organizationId, session.organizationId)
          ))
          .returning();
      } else {
        await db
          .update(posts)
          .set({
            [key]: key === "published" ? value === "true" : value,
          })
          .where(and(
            eq(posts.id, post.id),
            eq(posts.organizationId, session.organizationId)
          ))
          .returning();
      }

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
      if (error.code === "P2002") {
        redirect(
          `/post/${post.id}/settings?error=This+slug+is+already+in+use`
        );
      } else {
        redirect(
          `/post/${post.id}/settings?error=${encodeURIComponent(
            error.message
          )}`
        );
      }
      return;
    }
  }
);

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


export async function getAgentsWithSessionCount(siteId: string, createdBy: string): Promise<SelectAgent[]> {
  try {
    // Get the site to verify organization context
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, siteId),
      with: {
        organization: true,
        creator: true
      }
    });

    if (!site) {
      return [];
    }

    // Get all agents for the site with their creator info
    const agentsWithCreator = await db.query.agents.findMany({
      where: and(
        eq(agents.siteId, siteId),
        eq(agents.createdBy, createdBy)
      ),
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
        // Get sessions count from database
        const sessionCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(onboardingSessions)
          .where(eq(onboardingSessions.agentId, agent.id))
          .then(result => result[0].count);

        const formattedAgent: SelectAgent = {
          ...agent,
          site: agent.site ? {
            ...agent.site,
            organization: agent.site.organization,
            creator: agent.site.creator
          } : undefined,
          creator: agent.creator || {
            id: createdBy,
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
          },
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
// Update createOnboardingSession function
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
    };
  }
): Promise<string> => {
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error('Organization context required');
  }

  // Get the agent to verify it exists and belongs to organization
  const agent = await db.query.agents.findFirst({
    where: and(
      eq(agents.id, agentId),
      eq(sites.organizationId, session.organizationId)
    ),
    with: {
      site: true,
    },
  });

  if (!agent) {
    throw new Error('Agent not found or unauthorized');
  }

  // Check if multiple sessions are allowed
  if (!agent.settings.allowMultipleSessions) {
    // Count existing active sessions
    const activeSessions = await db.query.onboardingSessions.findMany({
      where: and(
        eq(onboardingSessions.agentId, agentId),
        eq(onboardingSessions.status, 'active'),
        eq(onboardingSessions.organizationId, session.organizationId)
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
    const [dbSession] = await db
      .insert(onboardingSessions)
      .values({
        id: sessionId,
        agentId,
        organizationId: session.organizationId,
        userId: data.userId,
        name: data.name,
        clientIdentifier: data.clientIdentifier || `${data.userId || 'anon'}-${sessionId}`,
        type: data.type,
        status: 'active',
        stepProgress: { steps: [] },
        metadata: {
          isAnonymous: !data.userId,
          isAuthenticated: !!data.userId,
          organizationId: session.organizationId,
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
        organizationId: session.organizationId
      },
      currentStep: 0
    });

    // Publish session creation event
    await redis.publish('session-events', {
      type: 'session-created',
      sessionId: dbSession.id,
      agentId,
      userId: effectiveUserId,
      isAnonymous: isAnonymous || !effectiveUserId,
      isAuthenticated: isAuthenticated && !!effectiveUserId,
      steps: initialSteps,
      timestamp: Date.now()
    });

    console.log('Created new session with steps:', {
      sessionId: dbSession.id,
      agentId,
      steps: initialSteps,
      type: data.type,
      effectiveUserId
    });

    return dbSession.id;

  } catch (error) {
    console.error('Failed to create session:', {
      error,
      agentId,
      userId: data.userId,
      type: data.type
    });
    throw error;
  }
};

// Retrieve all onboarding sessions for an agent, ensuring they belong to the user's organization
export const getSessions = async (agentId: string): Promise<SelectOnboardingSession[]> => {
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  return db.query.onboardingSessions.findMany({
    where: and(
      eq(onboardingSessions.agentId, agentId),
      eq(onboardingSessions.organizationId, session.organizationId)
    ),
    with: {
      conversations: {
        // Include messages within each conversation
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

export { addMessage, getConversationMessages, createConversation, getSessionConversations };
