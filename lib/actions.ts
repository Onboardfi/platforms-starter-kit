"use server";

import { getSession } from "@/lib/auth";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";
import { getBlurDataURL } from "@/lib/utils";
import { put } from "@vercel/blob";
import { eq, InferModel } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { revalidateTag } from "next/cache";
import { withPostAuth, withSiteAuth, withAgentAuth } from "./auth";
import db from "./db";
import { redirect } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";
import { Step, AgentSettings, UpdateAgentMetadataResponse, Agent } from '@/lib/types';
import {
  agents,
  SelectAgent,
  SelectPost,
  SelectSite,
  posts,
  sites,
  users,
  Step as SchemaStep,
} from "./schema";

interface CreateSiteResponse {
  error?: string;
  id?: string;
}

interface CreateAgentResponse {
  error?: string;
  id?: string;
}

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
);

type PostWithSite = InferModel<typeof posts, "select"> & {
  site: SelectSite;
};

type AgentWithSite = InferModel<typeof agents, "select"> & {
  site: SelectSite;
};

export const createSite = async (formData: FormData): Promise<CreateSiteResponse> => {
  const session = await getSession();
  if (!session?.user.id) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const subdomain = formData.get("subdomain") as string;

  try {
    const result = await db
      .insert(sites)
      .values({
        id: createId(),
        name,
        description,
        subdomain,
        userId: session.user.id,
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

export const createAgent = withSiteAuth(
  async (_: FormData, site: SelectSite): Promise<CreateAgentResponse> => {
    const session = await getSession();
    if (!session?.user.id) {
      return { error: "Unauthorized" };
    }

    try {
      const result = await db
        .insert(agents)
        .values({
          id: createId(),
          siteId: site.id,
          userId: session.user.id,
          name: "New Agent",
          description: "",
          slug: createId(),
          settings: {},
        })
        .returning();

      const agent = result[0];

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

export const updateStepCompletionStatus = async (
  agentId: string,
  stepIndex: number,
  completed: boolean
): Promise<UpdateAgentMetadataResponse> => {
  const agent = await getAgentById(agentId);

  if (!agent) {
    console.error(`Agent with ID ${agentId} not found.`);
    return { success: false, error: "Agent not found." };
  }

  if (!agent.settings.steps || stepIndex < 0 || stepIndex >= agent.settings.steps.length) {
    console.error(`Invalid step index ${stepIndex} for agent ${agentId}.`);
    return { success: false, error: "Invalid step index." };
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
      .where(eq(agents.id, agentId))
      .returning();

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to update agent steps: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export const updateAgentStepsWithoutAuth = async (
  agentId: string,
  steps: Step[]
): Promise<UpdateAgentMetadataResponse> => {
  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: { site: true },
    }) as AgentWithSite | undefined;

    if (!agent) {
      return { success: false, error: "Agent not found." };
    }

    const newSettings = { ...agent.settings, steps };

    await db
      .update(agents)
      .set({
        settings: newSettings,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId))
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
export const updateAgentMetadata = withAgentAuth(
  async (
    formData: FormData,
    agent: SelectAgent & {
      site: SelectSite;
    },
    key: string
  ): Promise<{ error?: string }> => {  // Change return type to match expected format
    try {
      if (key === "image") {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return { error: "Missing BLOB_READ_WRITE_TOKEN token" };
        }

        const file = formData.get("image") as File;
        const filename = `${nanoid()}.${file.type.split("/")[1]}`;

        const { url } = await put(filename, file, {
          access: "public",
        });

        const blurhash = await getBlurDataURL(url);
        await db
          .update(agents)
          .set({
            image: url,
            imageBlurhash: blurhash,
          })
          .where(eq(agents.id, agent.id))
          .returning();
      } else {
        const value = formData.get(key) as string;
        await db
          .update(agents)
          .set({
            [key]: value,
          })
          .where(eq(agents.id, agent.id))
          .returning();
      }

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

      return {};  // Return empty object on success
    } catch (error: any) {
      if (error.code === "P2002") {
        return { error: `This ${key} is already in use` };
      } else {
        return { error: error.message || "An error occurred" };
      }
    }
  }
);

export const updateAgentAPI = async (
  data: Partial<SelectAgent> & { id: string },
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, data.id),
    with: {
      site: true,
    },
  }) as AgentWithSite | undefined;

  if (!agent || agent.userId !== userId) {
    return { success: false, error: "Agent not found or unauthorized" };
  }

  try {
    await db
      .update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, data.id))
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

export const deleteAgent = async (
  formData: FormData,
  agentId: string
): Promise<void> => {
  const session = await getSession();
  if (!session?.user.id) {
    redirect("/login");
    return;
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      site: true,
    },
  }) as AgentWithSite | undefined;

  if (!agent || agent.userId !== session.user.id) {
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
    await db.delete(agents).where(eq(agents.id, agentId)).returning();

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

export const getAgentById = async (agentId: string): Promise<SelectAgent | null> => {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    columns: {
      id: true,
      name: true,
      description: true,
      slug: true,
      userId: true,
      siteId: true,
      createdAt: true,
      updatedAt: true,
      published: true,
      
      settings: true,
      image: true,
      imageBlurhash: true,
    },
    with: {
      site: true,
      user: true,
    },
  });

  if (!agent) return null;

  // Transform the result to match SelectAgent type
  const selectAgent: SelectAgent = {
    ...agent,
    siteName: agent.site?.name ?? null,
    userName: agent.user?.name ?? null,
    settings: agent.settings as AgentSettings,
  };

  return selectAgent;
};

export const updateSite = withSiteAuth(
  async (
    formData: FormData,
    site: SelectSite,
    key: string
  ): Promise<void> => {
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
            .where(eq(sites.id, site.id))
            .returning()
            .then((res) => res[0]);

          await Promise.all([
            addDomainToVercel(value),
          ]);
        } else if (value === "") {
          response = await db
            .update(sites)
            .set({
              customDomain: null,
            })
            .where(eq(sites.id, site.id))
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
          .where(eq(sites.id, site.id))
          .returning()
          .then((res) => res[0]);
      } else {
        response = await db
          .update(sites)
          .set({
            [key]: value,
          })
          .where(eq(sites.id, site.id))
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

export const deleteSite = withSiteAuth(
  async (_: FormData, site: SelectSite): Promise<void> => {
    try {
      await db.delete(sites).where(eq(sites.id, site.id)).returning();

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

export const getSiteFromPostId = async (postId: string): Promise<string | null> => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: {
      siteId: true,
    },
  });

  return post?.siteId || null;
};

export const createPost = withSiteAuth(
  async (_: FormData, site: SelectSite): Promise<void> => {
    const session = await getSession();
    if (!session?.user.id) {
      redirect("/login");
      return;
    }

    try {
      await db
        .insert(posts)
        .values({
          id: createId(),
          slug: createId(),
          siteId: site.id,
          userId: session.user.id,
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

export const updatePost = async (
  data: Partial<SelectPost> & { id: string }
): Promise<void> => {
  const session = await getSession();
  if (!session?.user.id) {
    redirect("/login");
    return;
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, data.id),
    with: {
      site: true,
    },
  }) as PostWithSite | undefined;

  if (!post || post.userId !== session.user.id) {
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
      .where(eq(posts.id, data.id))
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

export const updatePostMetadata = withPostAuth(
  async (
    formData: FormData,
    post: SelectPost & {
      site: SelectSite;
    },
    key: string
  ): Promise<void> => {
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
          .where(eq(posts.id, post.id))
          .returning();
      } else {
        await db
          .update(posts)
          .set({
            [key]: key === "published" ? value === "true" : value,
          })
          .where(eq(posts.id, post.id))
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

export const deletePost = withPostAuth(
  async (_: FormData, post: SelectPost): Promise<void> => {
    const session = await getSession();
    if (!session?.user.id) {
      redirect("/login");
      return;
    }

    const postWithSite = await db.query.posts.findFirst({
      where: eq(posts.id, post.id),
      with: {
        site: true,
      },
    }) as PostWithSite | undefined;

    if (!postWithSite || postWithSite.userId !== session.user.id) {
      redirect("/not-found");
      return;
    }

    try {
      await db.delete(posts).where(eq(posts.id, post.id)).returning();

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

export const updateAgent = async (
  data: Partial<SelectAgent> & { id: string }
): Promise<void> => {
  const session = await getSession();
  if (!session?.user.id) {
    redirect("/login");
    return;
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, data.id),
    with: {
      site: true,
    },
  }) as AgentWithSite | undefined;

  if (!agent || agent.userId !== session.user.id) {
    redirect("/not-found");
    return;
  }

  try {
    await db
      .update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, data.id))
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
      `/agent/${data.id}/settings?error=${encodeURIComponent(error.message)}`
    );
    return;
  }
};