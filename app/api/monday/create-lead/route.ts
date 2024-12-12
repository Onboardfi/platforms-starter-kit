import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { agents, organizationIntegrations } from '@/lib/schema';
import { MondayClient } from '@/lib/monday-client';

export async function POST(request: Request) {
  try {
    const { leadData, agentId } = await request.json();
    const agentHeader = request.headers.get('x-agent-id');

    const finalAgentId = agentId || agentHeader;
    if (!finalAgentId) {
      return NextResponse.json({
        error: 'Agent ID is required'
      }, { status: 400 });
    }

    // Get the agent and traverse up to organization
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, finalAgentId),
      with: {
        site: {
          with: {
            organization: true
          }
        }
      }
    });

    console.log('Agent and organization lookup:', {
      agentFound: !!agent,
      hasSite: !!agent?.site,
      hasOrg: !!agent?.site?.organization,
      orgId: agent?.site?.organization?.id
    });

    if (!agent?.site?.organization?.id) {
      return NextResponse.json({
        error: 'Invalid agent configuration',
        details: {
          agentFound: !!agent,
          hasSite: !!agent?.site,
          hasOrg: !!agent?.site?.organization
        }
      }, { status: 400 });
    }

    // Get organization's Monday.com integration
    const integration = await db.query.organizationIntegrations.findFirst({
      where: and(
        eq(organizationIntegrations.organizationId, agent.site.organization.id),
        eq(organizationIntegrations.provider, 'monday')
      )
    });

    if (!integration?.accessToken) {
      return NextResponse.json({
        error: 'Organization needs to connect Monday.com',
        details: {
          organizationId: agent.site.organization.id,
          requiresOrgAuth: true
        }
      }, { status: 401 });
    }

    // Use organization's settings or fallback to defaults
    const boardId = integration.settings?.boardId || "7906276603";
    const groupId = integration.settings?.groupId || "property_listings29358__1";

    // Create lead using organization's token
    const monday = new MondayClient({
      personalToken: integration.accessToken
    });

    const response = await monday.createItem(
      boardId,
      groupId,
      `${leadData.firstName} ${leadData.lastName}`,
      {
        'person_name': `${leadData.firstName} ${leadData.lastName}`,
        'email': { email: leadData.email, text: leadData.email },
        'phone': { phone: leadData.phone, text: leadData.phone },
        'company': leadData.company,
        'source': leadData.source || `Agent: ${agent.name}`,
        'notes': leadData.notes,
        'status': { label: 'New Lead' }
      }
    );

    if (!response.create_item?.id) {
      throw new Error('Failed to create lead in Monday.com');
    }

    return NextResponse.json({
      success: true,
      leadId: response.create_item.id
    });

  } catch (error) {
    console.error('Lead creation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create lead',
      details: { error }
    }, { status: 500 });
  }
}