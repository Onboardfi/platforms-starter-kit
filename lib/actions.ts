// lib/actions.ts
"use server";

import { getSession } from "@/lib/auth";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";
import { getBlurDataURL } from "@/lib/utils";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { revalidateTag } from "next/cache";
import { withPostAuth, withSiteAuth } from "./auth";
import db from "./db";
import { notFound } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";
import { json } from "drizzle-orm/pg-core";

import {
  agents,
  SelectAgent,
  SelectPost,
  SelectSite,
  posts,
  sites,
  users,
} from "./schema";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
); // 7-character random string

export const createSite = async (formData: FormData) => {
  const session = await getSession();
  if (!session?.user.id) {
    return {
      error: "Not authenticated",
    };
  }
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const subdomain = formData.get("subdomain") as string;

  try {
    const [response] = await db
      .insert(sites)
      .values({
        name,
        description,
        subdomain,
        userId: session.user.id,
      })
      .returning();

    revalidateTag(
      `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`
    );
    return response;
  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        error: `This subdomain is already taken`,
      };
    } else {
      return {
        error: error.message,
      };
    }
  }
};

export const createAgent = withSiteAuth(
  async (_: FormData, site: SelectSite) => {
    const session = await getSession();
    if (!session?.user.id) {
      return {
        error: "Not authenticated",
      };
    }

    const [response] = await db
      .insert(agents)
      .values({
        siteId: site.id,
        userId: session.user.id,
        name: "New Agent",
        description: "",
        slug: createId(), // Generate a unique slug
        settings: {}, // Initialize settings as an empty object
      })
      .returning();

    revalidateTag(
      `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
    );
    site.customDomain && revalidateTag(`${site.customDomain}-agents`);

    return response;
  }
);


// Add this function to update agent metadata
export const updateAgentMetadata = async (formData: FormData) => {
  const session = await getSession();
  if (!session?.user.id) {
    return { error: 'Not authenticated' };
  }

  const agentId = formData.get('agentId') as string;
  const key = formData.get('key') as string;
  const value = formData.get(key);

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      site: true,
    },
  });

  if (!agent || agent.userId !== session.user.id) {
    return { error: 'Agent not found or unauthorized' };
  }

  try {
    let response;

    if (key === 'image') {
      const file = formData.get('image') as File;
      if (file && file.size > 0) {
        const filename = `${nanoid()}.${file.type.split('/')[1]}`;
        const { url } = await put(filename, file, {
          access: 'public',
        });
        const blurhash = await getBlurDataURL(url);
        response = await db
          .update(agents)
          .set({
            image: url,
            imageBlurhash: blurhash,
          })
          .where(eq(agents.id, agentId))
          .returning()
          .then((res) => res[0]);
      } else {
        return { error: 'No image file selected' };
      }
    } else {
      response = await db
        .update(agents)
        .set({
          [key]: value,
        })
        .where(eq(agents.id, agentId))
        .returning()
        .then((res) => res[0]);
    }
    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
    );
    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${agent.slug}`
    );

    // If the site has a custom domain, revalidate those tags too
    agent.site?.customDomain &&
      (revalidateTag(`${agent.site?.customDomain}-agents`),
      revalidateTag(`${agent.site?.customDomain}-${agent.slug}`));

    return response;
  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        error: `This slug is already in use`,
      };
    } else {
      return {
        error: error.message,
      };
    }
  }
};

// Add this function to delete an agent
export const deleteAgent = async (formData: FormData, agentId: string) => {
  const session = await getSession();
  if (!session?.user.id) {
    return {
      error: "Not authenticated",
    };
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      site: true,
    },
  });

  if (!agent || agent.userId !== session.user.id) {
    return {
      error: "Agent not found or unauthorized",
    };
  }

  const confirm = formData.get("confirm") as string;
  if (confirm !== agent.name) {
    return {
      error: "Agent name does not match",
    };
  }

  try {
    const [response] = await db
      .delete(agents)
      .where(eq(agents.id, agentId))
      .returning({
        siteId: agents.siteId,
      });

    // Revalidate cache tags
    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
    );
    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${agent.slug}`
    );

    agent.site?.customDomain &&
      (revalidateTag(`${agent.site?.customDomain}-agents`),
      revalidateTag(`${agent.site?.customDomain}-${agent.slug}`));

    return response;
  } catch (error: any) {
    return {
      error: error.message,
    };
  }
};
type UpdateAgentResult = SelectAgent | { error: string };

export const updateAgent = async (data: SelectAgent) => {
  const session = await getSession();
  if (!session?.user.id) {
    return {
      error: "Not authenticated",
    };
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, data.id),
    with: {
      site: true,
    },
  });

  if (!agent || agent.userId !== session.user.id) {
    return {
      error: "Agent not found or unauthorized",
    };
  }

  try {
    const [response] = await db
      .update(agents)
      .set({
        name: data.name,
        description: data.description,
        slug: data.slug,
        published: data.published,
        settings: data.settings, // Update settings here
      })
      .where(eq(agents.id, data.id))
      .returning();

    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-agents`
    );
    revalidateTag(
      `${agent.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${agent.slug}`
    );

    // If the site has a custom domain, revalidate those tags too
    agent.site?.customDomain &&
      (revalidateTag(`${agent.site?.customDomain}-agents`),
      revalidateTag(`${agent.site?.customDomain}-${agent.slug}`));

    return response;
  } catch (error: any) {
    return {
      error: error.message,
    };
  }
};

// lib/actions.ts
export const getAgentById = async (agentId: string) => {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    // Include all necessary columns
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
    },
  });
  return agent;
};

export const updateSite = withSiteAuth(
  async (formData: FormData, site: SelectSite, key: string) => {
    const value = formData.get(key) as string;

    try {
      let response;

      if (key === "customDomain") {
        if (value.includes("vercel.pub")) {
          return {
            error: "Cannot use vercel.pub subdomain as your custom domain",
          };
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
            // Optional: add www subdomain as well and redirect to apex domain
            // addDomainToVercel(`www.${value}`),
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

        // If the site had a different customDomain before, we need to remove it from Vercel
        if (site.customDomain && site.customDomain !== value) {
          await removeDomainFromVercelProject(site.customDomain);
          // Optional: remove domain from Vercel team
          // ...
        }
      } else if (key === "image" || key === "logo") {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return {
            error:
              "Missing BLOB_READ_WRITE_TOKEN token. Note: Vercel Blob is currently in beta – please fill out this form for access: https://tally.so/r/nPDMNd",
          };
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

      console.log(
        "Updated site data! Revalidating tags: ",
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
        `${site.customDomain}-metadata`
      );
      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`
      );
      site.customDomain && revalidateTag(`${site.customDomain}-metadata`);

      return response;
    } catch (error: any) {
      if (error.code === "P2002") {
        return {
          error: `This ${key} is already taken`,
        };
      } else {
        return {
          error: error.message,
        };
      }
    }
  }
);

export const deleteSite = withSiteAuth(
  async (_: FormData, site: SelectSite) => {
    try {
      const [response] = await db
        .delete(sites)
        .where(eq(sites.id, site.id))
        .returning();

      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`
      );
      response.customDomain && revalidateTag(`${site.customDomain}-metadata`);
      return response;
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  }
);

export const getSiteFromPostId = async (postId: string) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: {
      siteId: true,
    },
  });

  return post?.siteId;
};

export const createPost = withSiteAuth(
  async (_: FormData, site: SelectSite) => {
    const session = await getSession();
    if (!session?.user.id) {
      return {
        error: "Not authenticated",
      };
    }

    const [response] = await db
      .insert(posts)
      .values({
        siteId: site.id,
        userId: session.user.id,
      })
      .returning();

    revalidateTag(
      `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`
    );
    site.customDomain && revalidateTag(`${site.customDomain}-posts`);

    return response;
  }
);

// Creating a separate function for this because we're not using FormData
export const updatePost = async (data: SelectPost) => {
  const session = await getSession();
  if (!session?.user.id) {
    return {
      error: "Not authenticated",
    };
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, data.id),
    with: {
      site: true,
    },
  });

  if (!post || post.userId !== session.user.id) {
    return {
      error: "Post not found",
    };
  }

  try {
    const [response] = await db
      .update(posts)
      .set({
        title: data.title,
        description: data.description,
        content: data.content,
      })
      .where(eq(posts.id, data.id))
      .returning();

    revalidateTag(
      `${post.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`
    );
    revalidateTag(
      `${post.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${post.slug}`
    );

    // If the site has a custom domain, we need to revalidate those tags too
    post.site?.customDomain &&
      (revalidateTag(`${post.site?.customDomain}-posts`),
      revalidateTag(`${post.site?.customDomain}-${post.slug}`));

    return response;
  } catch (error: any) {
    return {
      error: error.message,
    };
  }
};

export const updatePostMetadata = withPostAuth(
  async (
    formData: FormData,
    post: SelectPost & {
      site: SelectSite;
    },
    key: string
  ) => {
    const value = formData.get(key) as string;

    try {
      let response;
      if (key === "image") {
        const file = formData.get("image") as File;
        const filename = `${nanoid()}.${file.type.split("/")[1]}`;

        const { url } = await put(filename, file, {
          access: "public",
        });

        const blurhash = await getBlurDataURL(url);
        response = await db
          .update(posts)
          .set({
            image: url,
            imageBlurhash: blurhash,
          })
          .where(eq(posts.id, post.id))
          .returning()
          .then((res) => res[0]);
      } else {
        response = await db
          .update(posts)
          .set({
            [key]: key === "published" ? value === "true" : value,
          })
          .where(eq(posts.id, post.id))
          .returning()
          .then((res) => res[0]);
      }

      revalidateTag(
        `${post.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-posts`
      );
      revalidateTag(
        `${post.site?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-${post.slug}`
      );

      // If the site has a custom domain, we need to revalidate those tags too
      post.site?.customDomain &&
        (revalidateTag(`${post.site?.customDomain}-posts`),
        revalidateTag(`${post.site?.customDomain}-${post.slug}`));

      return response;
    } catch (error: any) {
      if (error.code === "P2002") {
        return {
          error: `This slug is already in use`,
        };
      } else {
        return {
          error: error.message,
        };
      }
    }
  }
);

export const deletePost = withPostAuth(
  async (_: FormData, post: SelectPost) => {
    try {
      const [response] = await db
        .delete(posts)
        .where(eq(posts.id, post.id))
        .returning({
          siteId: posts.siteId,
        });

      return response;
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  }
);

export const editUser = async (
  formData: FormData,
  _id: unknown,
  key: string
) => {
  const session = await getSession();
  if (!session?.user.id) {
    return {
      error: "Not authenticated",
    };
  }
  const value = formData.get(key) as string;

  try {
    const [response] = await db
      .update(users)
      .set({
        [key]: value,
      })
      .where(eq(users.id, session.user.id))
      .returning();

    return response;
  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        error: `This ${key} is already in use`,
      };
    } else {
      return {
        error: error.message,
      };
    }
  }
};
