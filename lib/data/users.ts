// lib/data/users.ts

import { users, agents, organizationMemberships } from "../schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import db from "../db";
import { z } from "zod";
import { authenticateUser, validateInput } from "./safe-action";
import { getSession } from "@/lib/auth";

/**
 * Get user data for the authenticated user with organization context
 */
export async function getUserData() {
  "use server";

  const userId = await authenticateUser();
  
  const userData = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      organizationMemberships: {
        with: {
          organization: true
        }
      },
      createdOrganizations: true,
      createdSites: true,
      createdAgents: true,
      createdPosts: true
    }
  });

  if (!userData) {
    throw new Error("User not found.");
  }

  const data = {
    id: userData.id,
    name: userData.name,
    username: userData.username,
    gh_username: userData.gh_username,
    email: userData.email,
    emailVerified: userData.emailVerified,
    image: userData.image,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
    organizations: userData.organizationMemberships.map(membership => ({
      ...membership.organization,
      role: membership.role
    })),
    created: {
      organizations: userData.createdOrganizations,
      sites: userData.createdSites,
      agents: userData.createdAgents,
      posts: userData.createdPosts
    }
  };

  return { data };
}

/**
 * Update user profile data
 */
const updateUserProfileSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
  gh_username: z.string().optional(),
  image: z.string().optional(),
});

export async function updateUserProfile(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const parsedInput = await validateInput(updateUserProfileSchema, input);

  const { name, username, gh_username, image } = parsedInput;

  try {
    await db
      .update(users)
      .set({
        name,
        username,
        gh_username,
        image,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Username already taken");
    }
    throw error;
  }
}

/**
 * Get usage statistics for the user within their organization context
 */
export async function getUsageForUser() {
  "use server";

  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get all agents created by the user in their current organization
  const usageData = await db
    .select({
      totalAgents: sql<number>`COUNT(DISTINCT ${agents.id})`.as("totalAgents"),
    })
    .from(agents)
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.userId, agents.createdBy),
        eq(organizationMemberships.organizationId, session.organizationId)
      )
    )
    .where(
      and(
        eq(agents.createdBy, session.user.id),
        gte(agents.createdAt, startOfMonth),
        lte(agents.createdAt, endOfMonth)
      )
    );

  return { data: usageData[0]?.totalAgents || 0 };
}

/**
 * Delete the authenticated user's account and clean up organization memberships
 */
export async function deleteUserAccount() {
  "use server";

  const session = await getSession();
  const userId = await authenticateUser();

  try {
    // Start a transaction to ensure all deletions succeed or none do
    await db.transaction(async (tx) => {
      // Delete organization memberships first
      await tx
        .delete(organizationMemberships)
        .where(eq(organizationMemberships.userId, userId));

      // Delete the user (this will cascade to their created content if configured)
      await tx.delete(users).where(eq(users.id, userId));
    });

    // Optionally, invalidate the user's session here if necessary

    return { success: true };
  } catch (error) {
    console.error('Failed to delete user account:', error);
    throw new Error('Failed to delete user account');
  }
}

/**
 * Get user's membership details for an organization
 */
export async function getUserOrganizationRole(organizationId: string) {
  "use server";

  const userId = await authenticateUser();

  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, organizationId)
    )
  });

  return membership ? { role: membership.role } : null;
}