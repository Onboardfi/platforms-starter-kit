// lib/data/agents.ts

import { agents, sites } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import db from "../db";
import { z } from "zod";
import { authenticateUser, validateInput } from "./safe-action";
import { createId } from '@paralleldrive/cuid2';

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
    .where(and(eq(sites.id, siteId), eq(sites.createdBy, userId)))
    .limit(1);

  if (!site.length) {
    throw new Error("You are not authorized to add agents to this site.");
  }

  // Create the agent
  const [newAgent] = await db
    .insert(agents)
    .values({
      id: createId(),
      name,
      description,
      slug,
      siteId,
      createdBy: userId,
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
  
  // Query agents with their related site data
  const agentsData = await db.query.agents.findMany({
    where: eq(agents.createdBy, userId),
    with: {
      site: {
        with: {
          organization: true,
          creator: true
        }
      },
      creator: true
    },
    orderBy: [desc(agents.createdAt)]
  });

  const data = agentsData.map((row) => ({
    // Agent fields
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    image: row.image,
    imageBlurhash: row.imageBlurhash,
    published: row.published,
    settings: row.settings,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    siteId: row.siteId,
    createdBy: row.createdBy,
    
    // Site information
    site: row.site ? {
      id: row.site.id,
      name: row.site.name,
      description: row.site.description,
      logo: row.site.logo,
      font: row.site.font,
      image: row.site.image,
      imageBlurhash: row.site.imageBlurhash,
      subdomain: row.site.subdomain,
      customDomain: row.site.customDomain,
      message404: row.site.message404,
      createdAt: row.site.createdAt,
      updatedAt: row.site.updatedAt,
      organizationId: row.site.organizationId,
      createdBy: row.site.createdBy,
      organization: row.site.organization,
      creator: row.site.creator
    } : null,
    
    // Additional fields
    siteName: row.site?.name ?? null,
    creator: row.creator
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
    .select({ agentCreatorId: agents.createdBy })
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  if (!agentWithUser.length || agentWithUser[0].agentCreatorId !== userId) {
    throw new Error("You are not authorized for this action.");
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, id),
    with: {
      site: true,
      creator: true
    }
  });

  if (!agent) {
    throw new Error("Agent not found.");
  }

  return {
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
    siteId: agent.site?.id || null,
    siteName: agent.site?.name || null,
    creator: agent.creator
  };
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
    .where(and(eq(sites.id, siteId), eq(sites.createdBy, userId)))
    .limit(1);

  if (!site.length) {
    throw new Error("You are not authorized for this action.");
  }

  const agentsData = await db.query.agents.findMany({
    where: eq(agents.siteId, siteId),
    orderBy: [desc(agents.createdAt)],
    with: {
      creator: true
    }
  });

  return {
    data: agentsData.map((agent) => ({
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
      creator: agent.creator
    }))
  };
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
    .select({ agentCreatorId: agents.createdBy })
    .from(agents)
    .where(eq(agents.id, id));

  if (!agentWithUser.length || agentWithUser[0].agentCreatorId !== userId) {
    throw new Error("You are not authorized for this action.");
  }

  await db.delete(agents).where(eq(agents.id, id));

  return { success: true };
}

export async function getAgentCounts(startDate?: Date, endDate?: Date) {
  "use server";

  const userId = await authenticateUser();

  const dateFilter = startDate && endDate 
    ? and(
        eq(agents.createdBy, userId),
        gte(agents.createdAt, startDate),
        lte(agents.createdAt, endDate)
      )
    : eq(agents.createdBy, userId);

  const agentCounts = await db
    .select({
      date: sql<string>`DATE(agents."createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(agents)
    .where(dateFilter)
    .groupBy(sql`DATE(agents."createdAt")`)
    .orderBy(sql`DATE(agents."createdAt")`);

  const dateMap = new Map<string, number>();
  agentCounts.forEach((item) => {
    const dateString = item.date;
    dateMap.set(dateString, Number(item.count));
  });

  const days = startDate && endDate 
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const chartData = [];
  for (let i = 0; i <= days; i++) {
    const date = startDate 
      ? new Date(startDate.getTime() + i * (1000 * 60 * 60 * 24))
      : new Date(Date.now() - (days - i) * (1000 * 60 * 60 * 24));
    
    const dateString = date.toISOString().split('T')[0];
    chartData.push({
      date: dateString,
      agents: dateMap.get(dateString) || 0,
    });
  }

  return { data: chartData };
}

export async function getUsageForUser() {
  "use server";

  const userId = await authenticateUser();

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
        eq(agents.createdBy, userId),
        gte(agents.createdAt, startOfMonth),
        lte(agents.createdAt, endOfMonth)
      )
    );

  return { data: usageData[0]?.totalAgents || 0 };
}