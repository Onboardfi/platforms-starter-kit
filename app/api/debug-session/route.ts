// app/api/debug-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { eq } from "drizzle-orm";
import { sites } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = await getToken({ req });

  // If there's a session, get additional context
  let siteInfo = null;
  if (session?.organizationId) {
    siteInfo = await db.query.sites.findFirst({
      where: eq(sites.organizationId, session.organizationId)
    });
  }

  return NextResponse.json({
    session,
    token,
    siteInfo,
    headers: {
      host: req.headers.get("host"),
      userAgent: req.headers.get("user-agent"),
    }
  });
}