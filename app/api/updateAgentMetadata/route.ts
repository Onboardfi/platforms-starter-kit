import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { updateAgentMetadata } from '@/lib/actions';
import { UpdateAgentMetadataResponse } from '@/lib/types';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { getBlurDataURL } from '@/lib/utils';
import { eq, and } from 'drizzle-orm';
import { agents, sites, users } from '@/lib/schema';
import type { SelectAgent, SelectSite } from '@/lib/schema';

// Helper type for user object
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
function createDefaultSite(organizationId: string): SelectSite {
  return {
    id: '',
    name: null,
    description: null,
    logo: null,
    font: 'font-cal',
    image: null,
    imageBlurhash: null,
    subdomain: null,
    customDomain: null,
    message404: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId,
    createdBy: '',
    organization: {
      id: '',
      name: '',
      slug: '',
      createdBy: '',
      logo: null, // Added missing property
      stripeCustomerId: null, // Added missing property
      stripeSubscriptionId: null, // Added missing property
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}, // This should be OrganizationMetadata type
    },
    creator: createDefaultUser(),
    _count: {
      agents: 0
    }
  };
}
export async function POST(
  request: NextRequest
): Promise<NextResponse<UpdateAgentMetadataResponse>> {
  const session = await getSession();

  if (!session?.user.id || !session.organizationId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const agentId = formData.get("agentId") as string;
    const key = formData.get("key") as string;

    if (!agentId || !key) {
      return NextResponse.json(
        { success: false, error: "agentId and key are required." },
        { status: 400 }
      );
    }

    // First fetch the agent with its site data
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
      }
    });

    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    // Construct the site object, ensuring it's never undefined
    const site = agent.site ? {
      ...agent.site,
      organization: agent.site.organization,
      creator: agent.site.creator || createDefaultUser(),
    } : createDefaultSite(session.organizationId);

    // Create the formatted agent with required properties
    const formattedAgent = {
      ...agent,
      site, // This will always be defined now
      creator: agent.creator || createDefaultUser(),
      siteName: agent.site?.name ?? null,
    } satisfies SelectAgent & { site: SelectSite };

    // Now call updateAgentMetadata with the properly formatted agent object
    const result = await updateAgentMetadata(formData, formattedAgent, key);

    return NextResponse.json({
      success: result.success ?? true,
      error: result.error,
      data: result.data
    });
  } catch (error: any) {
    console.error("Error in updateAgentMetadata API route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}