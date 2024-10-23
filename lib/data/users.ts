
// lib/data/users.ts

import { users, agents } from "../schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import db from "../db";
import { z } from "zod";
import { authenticateUser, validateInput } from "./safe-action";

/**
 * Get user data for the authenticated user
 */
export async function getUserData() {
  "use server";

  const userId = await authenticateUser();

  const userData = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userData.length) {
    throw new Error("User not found.");
  }

  const user = userData[0];

  const data = {
    id: user.id,
    name: user.name,
    username: user.username,
    gh_username: user.gh_username,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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

  // Update the user
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
}

/**
 * Get usage statistics for the user
 */
export async function getUsageForUser() {
  "use server";

  const userId = await authenticateUser();

  // Define the date range (e.g., current month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const usageData = await db
    .select({
      totalAgents: sql<number>`COUNT(*)`.as("totalAgents"),
    })
    .from(agents)
    .where(
      and(
        eq(agents.userId, userId),
        gte(agents.createdAt, startOfMonth),
        lte(agents.createdAt, endOfMonth)
      )
    );

  const totalAgents = usageData[0]?.totalAgents || 0;

  return { data: totalAgents };
}

/**
 * Delete the authenticated user's account
 */
export async function deleteUserAccount() {
  "use server";

  const userId = await authenticateUser();

  // Delete user-related data first (e.g., agents, sites, posts)
  // Assuming you have cascading deletes set up in your database schema

  // Delete the user
  await db.delete(users).where(eq(users.id, userId));

  // Optionally, invalidate the user's session here if necessary

  return { success: true };
}