// /app/api/getAgent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// **Add the GET handler below the existing POST handler**

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        userId: true,
        siteId: true,
        createdAt: true,
        updatedAt: true,
        published: true,
        settings: true,
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
