//Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/app/api/usage/route.ts

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
  tokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  dailyUsage: Array<{
    date: string;
    seconds: number;
    messages: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalStats] = await db.select({
      totalDuration: sql<number>`COALESCE(SUM(${usageLogs.durationSeconds}), 0)::int`,
      messageCount: sql<number>`COUNT(*)::int`,
      uniqueSessions: sql<number>`COUNT(DISTINCT ${usageLogs.sessionId})::int`,
      promptTokens: sql<number>`COALESCE(SUM(${usageLogs.promptTokens}), 0)::int`,
      completionTokens: sql<number>`COALESCE(SUM(${usageLogs.completionTokens}), 0)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${usageLogs.totalTokens}), 0)::int`
    })
    .from(usageLogs)
    .where(eq(usageLogs.userId, session.user.id));

    const dailyUsage = await db.select({
      date: sql<string>`DATE(${usageLogs.createdAt})::text`,
      seconds: sql<number>`COALESCE(SUM(${usageLogs.durationSeconds}), 0)::int`,
      messages: sql<number>`COUNT(*)::int`,
      promptTokens: sql<number>`COALESCE(SUM(${usageLogs.promptTokens}), 0)::int`,
      completionTokens: sql<number>`COALESCE(SUM(${usageLogs.completionTokens}), 0)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${usageLogs.totalTokens}), 0)::int`
    })
    .from(usageLogs)
    .where(eq(usageLogs.userId, session.user.id))
    .groupBy(sql`DATE(${usageLogs.createdAt})`);

    const usageStats: UsageStats = {
      totalMinutes: Math.floor(totalStats.totalDuration / 60),
      totalSeconds: totalStats.totalDuration,
      totalMessages: totalStats.messageCount,
      sessions: totalStats.uniqueSessions,
      tokens: {
        promptTokens: totalStats.promptTokens,
        completionTokens: totalStats.completionTokens,
        totalTokens: totalStats.totalTokens
      },
      dailyUsage
    };

    return NextResponse.json({ success: true, usage: usageStats });

  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';