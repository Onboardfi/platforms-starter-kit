// lib/data/dashboard2.ts
"use server";

import { onboardingSessions, messages, conversations, organizationMemberships, agents } from "../schema";
import { sql, and, eq, gte, lte } from "drizzle-orm";
import db from "../db";
import { getSession } from "@/lib/auth";

export async function getSessionAndUsageCountsForAgent(
  agentId: string,
  inputStartDate?: Date,
  inputEndDate?: Date
) {
  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  // Query the agent with its relationships
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

  if (!agent?.site?.organization) {
    throw new Error("Agent not found or not associated with an organization");
  }

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

  const formattedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
  const formattedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

  // Fetch session counts with proper organization context
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

  // Fetch message counts for the specific agent and organization
  const messageCounts = await db
    .select({
      date: sql<string>`DATE(messages."createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(messages)
    .innerJoin(
      conversations,
      eq(messages.conversationId, conversations.id)
    )
    .innerJoin(
      onboardingSessions,
      eq(conversations.sessionId, onboardingSessions.id)
    )
    .where(
      and(
        eq(onboardingSessions.agentId, agentId),
        eq(onboardingSessions.organizationId, agent.site.organization.id),
        gte(messages.createdAt, formattedStartDate),
        lte(messages.createdAt, formattedEndDate)
      )
    )
    .groupBy(sql`DATE(messages."createdAt")`)
    .orderBy(sql`DATE(messages."createdAt")`);

  // Create a complete date range map to ensure all dates are represented
  const dateMap = new Map<string, { sessions: number; messages: number }>();

  // Calculate days in range for the date map initialization
  const timeDiff = formattedEndDate.getTime() - formattedStartDate.getTime();
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Initialize all dates with zero values
  for (let i = 0; i <= days; i++) {
    const date = new Date(formattedStartDate);
    date.setDate(formattedStartDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
    dateMap.set(dateString, { sessions: 0, messages: 0 });
  }

  // Populate session counts from the database results
  sessionCounts.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.sessions = Number(item.count);
    }
  });

  // Populate message counts from the database results
  messageCounts.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.messages = Number(item.count);
    }
  });

  // Convert the map to a sorted array for the chart
  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      sessions: counts.sessions,
      messages: counts.messages,
    }));

  return { data: chartData };
}