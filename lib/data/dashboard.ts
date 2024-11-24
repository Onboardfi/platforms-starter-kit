"use server";

import { agents, sites, onboardingSessions } from "../schema";
import { sql, and, eq, gte, lte } from "drizzle-orm";
import db from "../db";
import { authenticateUser } from "./safe-action";
import { getSession } from "../auth";

export async function getAgentAndSiteCounts(inputStartDate?: Date, inputEndDate?: Date) {
  // Get both user ID and organization ID from session
  const session = await getSession();
  if (!session?.user.id || !session.organizationId) {
    throw new Error('Authentication required');
  }

  const userId = session.user.id;
  const organizationId = session.organizationId;

  // Use provided dates or default to last 30 days
  const endDate = inputEndDate || new Date();
  const startDate = inputStartDate || new Date(endDate);
  if (!inputStartDate) {
    startDate.setDate(endDate.getDate() - 29);
  }

  // Fetch all counts in parallel
  const [agentCounts, siteCounts, sessionCounts] = await Promise.all([
    // Agent counts - Check for agents created by user within organization
    db.select({
      date: sql<string>`DATE(agents."createdAt")::text`.as("date"),
      count: sql<number>`COUNT(*)::integer`.as("count"),
    })
    .from(agents)
    .innerJoin(sites, eq(agents.siteId, sites.id))
    .where(
      and(
        eq(agents.createdBy, userId),
        eq(sites.organizationId, organizationId),
        gte(agents.createdAt, startDate),
        lte(agents.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE(agents."createdAt")`)
    .orderBy(sql`DATE(agents."createdAt")`),

    // Site counts - Get sites for the organization
    db.select({
      date: sql<string>`DATE(sites."createdAt")::text`.as("date"),
      count: sql<number>`COUNT(*)::integer`.as("count"),
    })
    .from(sites)
    .where(
      and(
        eq(sites.organizationId, organizationId),
        gte(sites.createdAt, startDate),
        lte(sites.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE(sites."createdAt")`)
    .orderBy(sql`DATE(sites."createdAt")`),

    // Session counts - Join with agents and sites to get organization context
    db.select({
      date: sql<string>`DATE(onboarding_sessions."createdAt")::text`.as("date"),
      count: sql<number>`COUNT(*)::integer`.as("count"),
    })
    .from(onboardingSessions)
    .innerJoin(agents, eq(onboardingSessions.agentId, agents.id))
    .innerJoin(sites, eq(agents.siteId, sites.id))
    .where(
      and(
        eq(sites.organizationId, organizationId),
        gte(onboardingSessions.createdAt, startDate),
        lte(onboardingSessions.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE(onboarding_sessions."createdAt")`)
    .orderBy(sql`DATE(onboarding_sessions."createdAt")`)
  ]);

  // Create date map for all dates
  const dateMap = new Map<string, { agents: number; sites: number; sessions: number }>();

  // Calculate the number of days in the range
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Initialize all dates with zero counts
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
    dateMap.set(dateString, { agents: 0, sites: 0, sessions: 0 });
  }

  // Add counts to map
  agentCounts.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.agents = Number(item.count);
    }
  });

  siteCounts.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.sites = Number(item.count);
    }
  });

  sessionCounts.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.sessions = Number(item.count);
    }
  });

  // Convert map to array and sort by date
  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      ...counts
    }));

  return { data: chartData };
}