//Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/usage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import db from "@/lib/db";
import { usageLogs } from "@/lib/schema";

interface UsageStats {
  totalMinutes: number;
  totalSeconds: number;
  totalMessages: number;
  sessions: number;
  dailyUsage: Array<{
    date: string;
    seconds: number;
    messages: number;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Simple query to get total usage - no date filtering
    const [totalStats] = await db.select({
      totalDuration: sql<number>`COALESCE(SUM(${usageLogs.durationSeconds}), 0)::int`,
      messageCount: sql<number>`COUNT(*)::int`,
      uniqueSessions: sql<number>`COUNT(DISTINCT ${usageLogs.sessionId})::int`
    })
    .from(usageLogs)
    .where(eq(usageLogs.userId, userId));

    // Simple daily breakdown - no date filtering
    const dailyUsage = await db.select({
      date: sql<string>`DATE(${usageLogs.createdAt})::text`,
      seconds: sql<number>`COALESCE(SUM(${usageLogs.durationSeconds}), 0)::int`,
      messages: sql<number>`COUNT(*)::int`
    })
    .from(usageLogs)
    .where(eq(usageLogs.userId, userId))
    .groupBy(sql`DATE(${usageLogs.createdAt})`);

    const usageStats: UsageStats = {
      totalMinutes: Math.floor(totalStats.totalDuration / 60),
      totalSeconds: totalStats.totalDuration,
      totalMessages: totalStats.messageCount,
      sessions: totalStats.uniqueSessions,
      dailyUsage: dailyUsage
    };

    return NextResponse.json({
      success: true,
      usage: usageStats
    });

  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 }
    );
  }
}