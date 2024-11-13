// lib/data/dashboard2.ts

"use server";

import { onboardingSessions, usageLogs, agents } from "../schema";
import { sql, and, eq, gte, lte } from "drizzle-orm";
import db from "../db";
import { authenticateUser } from "./safe-action";

/**
 * Fetches the number of sessions and total usage duration per day for a specific agent.
 * @param agentId - The ID of the agent.
 * @param inputStartDate - (Optional) Start date for the data range.
 * @param inputEndDate - (Optional) End date for the data range.
 * @returns An object containing the chart data with sessions and usage durations.
 */
export async function getSessionAndUsageCountsForAgent(
  agentId: string,
  inputStartDate?: Date,
  inputEndDate?: Date
) {
  // Authenticate the user
  const userId = await authenticateUser();

  // Validate that the agent belongs to the authenticated user
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1)
    .then((res) => res[0]);

  if (!agent || agent.userId !== userId) {
    throw new Error("Unauthorized access to agent data.");
  }

  // Use provided dates or default to last 30 days
  const endDate = inputEndDate || new Date();
  const startDate = inputStartDate || new Date(endDate);
  if (!inputStartDate) {
    startDate.setDate(endDate.getDate() - 29);
  }

  // Format dates to remove time for grouping
  const formattedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
  const formattedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

  // Fetch session counts
  const sessionCounts = await db
    .select({
      date: sql<string>`DATE(onboarding_sessions."createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(onboardingSessions)
    .where(
      and(
        eq(onboardingSessions.agentId, agentId),
        gte(onboardingSessions.createdAt, formattedStartDate),
        lte(onboardingSessions.createdAt, formattedEndDate)
      )
    )
    .groupBy(sql`DATE(onboarding_sessions."createdAt")`)
    .orderBy(sql`DATE(onboarding_sessions."createdAt")`);

  // Fetch usage duration in seconds
  const usageDurations = await db
    .select({
      date: sql<string>`DATE(usage_logs."createdAt")`.as("date"),
      totalDuration: sql<number>`SUM(usage_logs."durationSeconds")`.as("totalDuration"),
    })
    .from(usageLogs)
    .innerJoin(onboardingSessions, eq(usageLogs.sessionId, onboardingSessions.id))
    .where(
      and(
        eq(onboardingSessions.agentId, agentId),
        gte(usageLogs.createdAt, formattedStartDate),
        lte(usageLogs.createdAt, formattedEndDate)
      )
    )
    .groupBy(sql`DATE(usage_logs."createdAt")`)
    .orderBy(sql`DATE(usage_logs."createdAt")`);

  // Create a date map for all dates in the range
  const dateMap = new Map<string, { sessions: number; totalDuration: number }>();

  // Calculate the number of days in the range
  const timeDiff = formattedEndDate.getTime() - formattedStartDate.getTime();
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Initialize all dates with zero counts
  for (let i = 0; i <= days; i++) {
    const date = new Date(formattedStartDate);
    date.setDate(formattedStartDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
    dateMap.set(dateString, { sessions: 0, totalDuration: 0 });
  }

  // Add session counts to the map
  sessionCounts.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.sessions = Number(item.count);
    }
  });

  // Add usage durations to the map
  usageDurations.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.totalDuration = Number(item.totalDuration);
    }
  });

  // Convert map to array and sort by date
  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      sessions: counts.sessions,
      totalDuration: counts.totalDuration, // in seconds
    }));

  return { data: chartData };
}