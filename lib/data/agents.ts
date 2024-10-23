// lib/data/agents.ts

import { agents, sites } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import db from "../db";
import { z } from "zod";
import { authenticateUser, validateInput } from "./safe-action";

/**
 * Creates a new agent in the database
 */
const createAgentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  siteId: z.string(),
  image: z.string().optional(),
  imageBlurhash: z.string().optional(),
  published: z.boolean().optional(),
  settings: z.any().optional(),
});

export async function createAgent(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const parsedInput = await validateInput(createAgentSchema, input);

  const {
    name,
    description,
    slug,
    siteId,
    image,
    imageBlurhash,
    published = false,
    settings = {},
  } = parsedInput;

  // Ensure the user owns the site
  const site = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);

  if (!site.length) {
    throw new Error("You are not authorized to add agents to this site.");
  }

  // Create the agent
  const [newAgent] = await db
    .insert(agents)
    .values({
      id: crypto.randomUUID(), // Use any ID generation method you prefer
      name,
      description,
      slug,
      siteId,
      userId,
      image,
      imageBlurhash,
      published,
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ agentId: agents.id });

  return newAgent.agentId;
}

/**
 * Gets all agents for a user
 */
export async function getAgents() {
  "use server";

  const userId = await authenticateUser();
  const agentsData = await db
  .select()
  .from(agents)
  .leftJoin(sites, eq(agents.siteId, sites.id))
  .where(eq(agents.userId, userId))
  .orderBy(desc(agents.createdAt));

const data = agentsData.map((agent) => ({
  id: agent.agents.id,
  name: agent.agents.name,
  description: agent.agents.description,
  slug: agent.agents.slug,
  image: agent.agents.image,
  imageBlurhash: agent.agents.imageBlurhash,
  published: agent.agents.published,
  settings: agent.agents.settings, // Ensure settings is included
  createdAt: agent.agents.createdAt,
  updatedAt: agent.agents.updatedAt,
  site: {
    subdomain: agent.sites?.subdomain || null,
  },
  userId: agent.agents.userId,
}));

return { data };
}
/**
 * Get agent data for one specific agent
 */
const getAgentDataSchema = z.object({ id: z.string() });

export async function getAgentData(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const parsedInput = await validateInput(getAgentDataSchema, input);
  const { id } = parsedInput;

  const agentWithUser = await db
    .select({ agentUserId: agents.userId })
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  if (!agentWithUser.length || agentWithUser[0].agentUserId !== userId) {
    throw new Error("You are not authorized for this action.");
  }

  const agentData = await db
    .select()
    .from(agents)
    .leftJoin(sites, eq(agents.siteId, sites.id))
    .where(eq(agents.id, id))
    .limit(1);

  if (!agentData.length) {
    throw new Error("Agent not found.");
  }

  const agent = agentData[0];

  const data = {
    id: agent.agents.id,
    name: agent.agents.name,
    description: agent.agents.description,
    slug: agent.agents.slug,
    image: agent.agents.image,
    imageBlurhash: agent.agents.imageBlurhash,
    published: agent.agents.published,
    settings: agent.agents.settings,
    createdAt: agent.agents.createdAt,
    updatedAt: agent.agents.updatedAt,
    siteId: agent.sites?.id || null,
    siteName: agent.sites?.name || null,
  };

  return data;
}

/**
 * Get all agents by a site ID
 */
const getAgentsBySiteSchema = z.object({ siteId: z.string() });

export async function getAgentsBySite(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const parsedInput = await validateInput(getAgentsBySiteSchema, input);
  const { siteId } = parsedInput;

  const site = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);

  if (!site.length) {
    throw new Error("You are not authorized for this action.");
  }

  const agentsData = await db
    .select()
    .from(agents)
    .where(eq(agents.siteId, siteId))
    .orderBy(desc(agents.createdAt));

  const data = agentsData.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    slug: agent.slug,
    image: agent.image,
    imageBlurhash: agent.imageBlurhash,
    published: agent.published,
    settings: agent.settings,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    siteId: agent.siteId,
  }));

  return { data };
}

/**
 * Delete an agent by ID
 */
const deleteAgentSchema = z.object({ id: z.string() });

export async function deleteAgent(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const parsedInput = await validateInput(deleteAgentSchema, input);
  const { id } = parsedInput;

  const agentWithUser = await db
    .select({ agentUserId: agents.userId })
    .from(agents)
    .where(eq(agents.id, id));

  if (!agentWithUser.length || agentWithUser[0].agentUserId !== userId) {
    throw new Error("You are not authorized for this action.");
  }

  await db.delete(agents).where(eq(agents.id, id));
  // Optionally revalidate paths if you're using caching
  // revalidatePath("/agents");

  return { success: true };
}

/**
 * Get agent counts over time for the dashboard chart
 */
export async function getAgentCounts() {
  "use server";

  const userId = await authenticateUser();

  // Define the date range (e.g., past 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29); // Past 30 days including today

  // Define the type for agent counts
  type AgentCount = {
    date: string; // 'YYYY-MM-DD' format
    count: number;
  };

  // Fetch agent counts grouped by date
  const agentCounts: AgentCount[] = await db
    .select({
      date: sql<string>`DATE("createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(agents)
    .where(
      and(
        eq(agents.userId, userId),
        gte(agents.createdAt, startDate),
        lte(agents.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE("createdAt")`)
    .orderBy(sql`DATE("createdAt")`);

  // Prepare data for the chart
  const chartData = [];

  // Create a date map for quick lookup
  const dateMap = new Map<string, number>();
  agentCounts.forEach((item) => {
    const dateString = item.date; // Use item.date directly
    dateMap.set(dateString, item.count);
  });

  // Fill in missing dates with zero counts
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0]; // 'YYYY-MM-DD' format
    chartData.push({
      date: dateString,
      agents: dateMap.get(dateString) || 0,
    });
  }

  return { data: chartData };
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