// lib/data/dashboard2.ts
"use server";

import { onboardingSessions, usageLogs, agents, organizationMemberships } from "../schema";
import { sql, and, eq, gte, lte } from "drizzle-orm";
import db from "../db";
import { authenticateUser } from "./safe-action";
import { getSession } from "@/lib/auth";

/**
 * Fetches the number of sessions and total usage duration per day for a specific agent.
 * Uses organization-based access control to ensure proper authorization.
 * 
 * @param agentId - The ID of the agent to get metrics for
 * @param inputStartDate - (Optional) Start date for the data range
 * @param inputEndDate - (Optional) End date for the data range
 * @returns An object containing daily metrics for sessions and usage duration
 */
export async function getSessionAndUsageCountsForAgent(
  agentId: string,
  inputStartDate?: Date,
  inputEndDate?: Date
) {
  // Get current user and organization context
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  // Get the agent with its complete organization context
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      site: {
        with: {
          organization: true
        }
      }
    }
  });

  // Verify agent exists and belongs to a site with organization
  if (!agent?.site?.organization) {
    throw new Error("Agent not found or not associated with an organization");
  }

  // Verify user has access to this organization
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, session.user.id),
      eq(organizationMemberships.organizationId, agent.site.organization.id)
    )
  });

  if (!membership) {
    throw new Error("Unauthorized access to agent data");
  }

  // Use provided dates or default to last 30 days
  const endDate = inputEndDate || new Date();
  const startDate = inputStartDate || new Date(endDate);
  if (!inputStartDate) {
    startDate.setDate(endDate.getDate() - 29);
  }

  // Format dates consistently for grouping
  const formattedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
  const formattedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

  // Fetch session counts with organization context
  const sessionCounts = await db
    .select({
      date: sql<string>`DATE(onboarding_sessions."createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(onboardingSessions)
    .where(
      and(
        eq(onboardingSessions.agentId, agentId),
        eq(onboardingSessions.organizationId, agent.site.organization.id),
        gte(onboardingSessions.createdAt, formattedStartDate),
        lte(onboardingSessions.createdAt, formattedEndDate)
      )
    )
    .groupBy(sql`DATE(onboarding_sessions."createdAt")`)
    .orderBy(sql`DATE(onboarding_sessions."createdAt")`);

  // Fetch usage durations with organization context
  const usageDurations = await db
    .select({
      date: sql<string>`DATE(usage_logs."createdAt")`.as("date"),
      totalDuration: sql<number>`SUM(usage_logs."durationSeconds")`.as("totalDuration"),
    })
    .from(usageLogs)
    .innerJoin(
      onboardingSessions, 
      eq(usageLogs.sessionId, onboardingSessions.id)
    )
    .where(
      and(
        eq(onboardingSessions.agentId, agentId),
        eq(usageLogs.organizationId, agent.site.organization.id),
        gte(usageLogs.createdAt, formattedStartDate),
        lte(usageLogs.createdAt, formattedEndDate)
      )
    )
    .groupBy(sql`DATE(usage_logs."createdAt")`)
    .orderBy(sql`DATE(usage_logs."createdAt")`);

  // Create a complete date range map
  const dateMap = new Map<string, { sessions: number; totalDuration: number }>();

  // Calculate days in range
  const timeDiff = formattedEndDate.getTime() - formattedStartDate.getTime();
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Initialize all dates with zero values
  for (let i = 0; i <= days; i++) {
    const date = new Date(formattedStartDate);
    date.setDate(formattedStartDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
    dateMap.set(dateString, { sessions: 0, totalDuration: 0 });
  }

  // Populate session counts
  sessionCounts.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.sessions = Number(item.count);
    }
  });

  // Populate usage durations
  usageDurations.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.totalDuration = Number(item.totalDuration);
    }
  });

  // Convert to sorted array format
  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      sessions: counts.sessions,
      totalDuration: counts.totalDuration,
    }));

  return { data: chartData };
}