import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import type { SelectAgent, SelectSite, AgentSettings } from '@/lib/schema';

// Type helper for user inference
type UserSelect = {
  id: string;
  name: string | null;
  username: string | null;
  gh_username: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

function createDefaultUser(): UserSelect {
  return {
    id: '',
    name: null,
    username: null,
    gh_username: null,
    email: '',
    emailVerified: null,
    image: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function formatSite(site: any): SelectSite | undefined {
  if (!site) return undefined;

  return {
    id: site.id,
    name: site.name,
    description: site.description,
    logo: site.logo,
    font: site.font || 'font-cal',
    image: site.image || null,
    imageBlurhash: site.imageBlurhash || null,
    subdomain: site.subdomain,
    customDomain: site.customDomain,
    message404: site.message404,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    organizationId: site.organizationId,
    createdBy: site.createdBy,
    organization: site.organization,
    creator: site.creator || createDefaultUser(),
    _count: site._count
  };
}

// POST handler for authenticated requests
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user.id || !session.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId } = body;

    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: {
        site: {
          with: {
            organization: true,
            creator: true
          }
        },
        creator: true
      },
    });

    if (!agent || agent.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    const formattedAgent: SelectAgent = {
      ...agent,
      site: formatSite(agent.site),
      siteName: agent.site?.name ?? null,
      settings: agent.settings as AgentSettings,
      creator: agent.creator || createDefaultUser()
    };

    return NextResponse.json({ agent: formattedAgent });
  } catch (error: any) {
    console.error('Error in POST /api/getAgent:', error);
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
      with: {
        site: {
          with: {
            organization: true,
            creator: true
          }
        },
        creator: true
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const formattedAgent: SelectAgent = {
      ...agent,
      site: formatSite(agent.site),
      siteName: agent.site?.name ?? null,
      settings: agent.settings as AgentSettings,
      creator: agent.creator || createDefaultUser()
    };

    return NextResponse.json({ agent: formattedAgent });
  } catch (error: any) {
    console.error('Error in GET /api/getAgent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}