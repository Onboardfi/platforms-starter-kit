// app/api/get-site-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { sites, agents } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
    }

    // Only allow this endpoint to be called from middleware
    const isMiddleware = req.headers.get('x-middleware-request') === 'true';
    if (!isMiddleware) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get site and associated agent in a single query
    const result = await db.query.sites.findFirst({
      where: eq(sites.subdomain, subdomain),
      with: {
        agents: {
          where: and(
            eq(agents.published, true)
          ),
          limit: 1
        }
      }
    });

    if (!result) {
      return NextResponse.json({ site: null, agent: null });
    }

    // Extract the first agent if it exists
    const agent = result.agents?.[0] || null;

    return NextResponse.json({ 
      site: {
        id: result.id,
        name: result.name,
        subdomain: result.subdomain,
        customDomain: result.customDomain
      },
      agent: agent ? {
        id: agent.id,
        settings: agent.settings,
        published: agent.published
      } : null
    });
  } catch (error) {
    console.error('Error fetching site info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}