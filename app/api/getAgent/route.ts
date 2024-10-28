// /app/api/getAgent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// POST handler for authenticated requests
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId } = body;

    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      columns: {
        id: true,
        name: true,
        description: true,
        slug: true,
        userId: true,
        siteId: true,
        createdAt: true,
        updatedAt: true,
        published: true,
        settings: true,
      },
      with: {
        site: {
          columns: {
            id: true,
            name: true,
            description: true,
            logo: true,  // Include logo field
            font: true,
            subdomain: true,
            customDomain: true,
            message404: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          }
        },
      },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET handler for public access
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required.' }, { status: 400 });
    }

    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      columns: {
        id: true,
        name: true,
        description: true,
        slug: true,
        siteId: true,
        createdAt: true,
        updatedAt: true,
        published: true,
        settings: true,
      },
      with: {
        site: {
          columns: {
            id: true,
            name: true,
            description: true,
            logo: true,  // Include logo field
            font: true,
            subdomain: true,
            customDomain: true,
            message404: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          }
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Transform the response to ensure consistent structure
    const response = {
      agent: {
        ...agent,
        site: agent.site || {
          id: '',
          name: null,
          description: null,
          logo: null,
          font: 'font-cal',
          subdomain: null,
          customDomain: null,
          message404: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: null,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching agent data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}