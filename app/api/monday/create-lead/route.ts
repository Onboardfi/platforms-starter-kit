// app/api/monday/create-lead/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { agents, organizationIntegrations } from '@/lib/schema';
import { MondayClient } from '@/lib/monday-client';

interface LeadData {
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}
export async function POST(request: Request) {
    try {
      const { leadData, agentId } = await request.json();
      
      // Validate required fields
      if (!leadData?.firstName || !leadData?.lastName) {
        return NextResponse.json({ 
          error: 'First name and last name are required' 
        }, { status: 400 });
      }
  
      if (!agentId) {
        return NextResponse.json({ 
          error: 'Agent ID is required' 
        }, { status: 400 });
      }
  
      // Get agent with site and organization details
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
        with: {
          site: {
            with: {
              organization: true
            }
          }
        }
      });
  
      if (!agent?.site?.organization?.id) {
        return NextResponse.json({ 
          error: 'Agent configuration not found' 
        }, { status: 404 });
      }
  
      // Get Monday.com integration
      const integration = await db.query.organizationIntegrations.findFirst({
        where: and(
          eq(organizationIntegrations.organizationId, agent.site.organization.id),
          eq(organizationIntegrations.provider, 'monday')
        )
      });
  
      if (!integration?.accessToken) {
        return NextResponse.json({ 
          error: 'Monday.com integration not connected' 
        }, { status: 401 });
      }
  
      const { boardId, groupId = 'leads' } = integration.settings || {};
      if (!boardId) {
        return NextResponse.json({ 
          error: 'Monday.com board not configured' 
        }, { status: 400 });
      }
  
      // Initialize Monday client
      const monday = new MondayClient({
        personalToken: integration.accessToken
      });
  
      // Verify token is valid
      const isValid = await monday.validateCredentials();
      if (!isValid) {
        return NextResponse.json({ 
          error: 'Monday.com authentication failed' 
        }, { status: 401 });
      }
  
      // Create the lead
      const response = await monday.createItem(
        boardId,
        groupId,
        `${leadData.firstName} ${leadData.lastName}`,
        {
          'person_name': `${leadData.firstName} ${leadData.lastName}`,
          'email': { email: leadData.email, text: leadData.email },
          'phone': { phone: leadData.phone, text: leadData.phone },
          'company': leadData.company,
          'source': leadData.source,
          'notes': leadData.notes,
          'status': { label: 'New Lead' }
        }
      );
  
      return NextResponse.json({
        success: true,
        leadId: response.create_item?.id
      });
  
    } catch (error) {
      console.error('Failed to create lead:', error);
      
      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('Rate limit exceeded')) {
          return NextResponse.json({ 
            error: 'Too many requests to Monday.com' 
          }, { status: 429 });
        }
        
        return NextResponse.json({ 
          error: error.message 
        }, { status: 500 });
      }
  
      return NextResponse.json({ 
        error: 'An unexpected error occurred' 
      }, { status: 500 });
    }
  }