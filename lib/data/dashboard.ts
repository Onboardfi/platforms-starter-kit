// lib/data/dashboard.ts

import { agents, sites } from "../schema";
import { sql, and, eq, gte, lte } from "drizzle-orm";
import db from "../db";
import { authenticateUser } from "./safe-action";

export async function getAgentAndSiteCounts() {
  "use server";

  const userId = await authenticateUser();

  // Define the date range (e.g., past 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29); // Past 30 days including today

  // Fetch agent counts grouped by date
  const agentCounts = await db
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

  // Fetch site counts grouped by date
  const siteCounts = await db
    .select({
      date: sql<string>`DATE("createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(sites)
    .where(
      and(
        eq(sites.userId, userId),
        gte(sites.createdAt, startDate),
        lte(sites.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE("createdAt")`)
    .orderBy(sql`DATE("createdAt")`);

  // Prepare data for the chart
  const chartData = [];

  // Create date maps for quick lookup
  const agentDateMap = new Map<string, number>();
  agentCounts.forEach((item) => {
    const dateString = item.date; // 'YYYY-MM-DD'
    agentDateMap.set(dateString, Number(item.count));
  });

  const siteDateMap = new Map<string, number>();
  siteCounts.forEach((item) => {
    const dateString = item.date;
    siteDateMap.set(dateString, Number(item.count));
  });

  // Fill in missing dates with zero counts
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0]; // 'YYYY-MM-DD' format

    chartData.push({
      date: dateString,
      agents: agentDateMap.get(dateString) || 0,
      sites: siteDateMap.get(dateString) || 0,
    });
  }

  return { data: chartData };
}
