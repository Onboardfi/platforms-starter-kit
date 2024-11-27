import { NextRequest, NextResponse } from 'next/server';
import { updateAgentMetadata } from '@/lib/actions';
import { getSession } from '@/lib/auth';
import { UpdateAgentMetadataResponse } from '@/lib/types';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { agents } from '@/lib/schema';
import type { SelectAgent, SelectSite } from '@/lib/schema';

// Helper function to create a default user object
function createDefaultUser() {
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
    const key = "general"; // Use a specific key for general updates

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: "agentId is required." },
        { status: 400 }
      );
    }

    // Fetch the agent with its relations
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

    // Create a properly formatted agent object
    const formattedAgent = {
      ...agent,
      site: agent.site ? {
        ...agent.site,
        organization: agent.site.organization,
        creator: agent.site.creator || createDefaultUser()
      } : {
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
        organizationId: session.organizationId,
        createdBy: '',
        organization: {
          id: '',
          name: '',
          slug: '',
          createdBy: '',
          logo: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {}
        },
        creator: createDefaultUser(),
        _count: {
          agents: 0
        }
      },
      creator: agent.creator || createDefaultUser(),
      siteName: agent.site?.name ?? null
    } satisfies SelectAgent & { site: SelectSite };

    const result = await updateAgentMetadata(formData, formattedAgent, key);

    return NextResponse.json({
      success: result.success ?? true,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Error in updateAgentGeneral API route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}