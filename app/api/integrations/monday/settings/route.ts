// app/api/integrations/monday/settings/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { organizationIntegrations } from '@/lib/schema';
import { getSession } from '@/lib/auth';
import { MondayClient } from '@/lib/monday-client';
import { MondayOAuthClient } from '@/lib/monday/oauth-client';

// Define interface for integration type
interface MondayIntegration {
  id: string;
  organizationId: string;
  provider: string;
  accessToken: string | null;
  tokenType: string | null;
  refreshToken: string | null;
  scope: string | null;
  settings: {
    boardId?: string;
    groupId?: string;
    columnMappings?: Record<string, string>;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

async function handleTokenExpiration(integration: MondayIntegration) {
  const client = new MondayOAuthClient({
    clientId: process.env.MONDAY_CLIENT_ID!,
    clientSecret: process.env.MONDAY_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/monday/callback`
  });

  try {
    if (!integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    const { access_token, refresh_token } = await client.refreshToken(integration.refreshToken);

    // Update the integration with new tokens
    await db
      .update(organizationIntegrations)
      .set({
        accessToken: access_token,
        scope: integration.scope, // Preserve existing scope
        tokenType: integration.tokenType, // Preserve token type
        updatedAt: new Date()
      })
      .where(eq(organizationIntegrations.id, integration.id));

    return access_token;
  } catch (error) {
    throw new Error('Token refresh failed - requires reauthorization');
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await request.json();
    if (!settings.boardId) {
      return NextResponse.json({ 
        error: 'Board ID is required' 
      }, { status: 400 });
    }

    const integration = await db.query.organizationIntegrations.findFirst({
      where: and(
        eq(organizationIntegrations.organizationId, session.organizationId),
        eq(organizationIntegrations.provider, 'monday')
      )
    }) as MondayIntegration | null;

    if (!integration) {
      return NextResponse.json({ 
        error: 'Monday.com integration not found',
        requiresAuth: true 
      }, { status: 404 });
    }

    let accessToken = integration.accessToken;
    let requiresReauth = false;

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Monday.com authentication required',
        requiresAuth: true 
      }, { status: 401 });
    }

    try {
      const monday = new MondayClient({ personalToken: accessToken });
      
      // First try with existing token
      const isValid = await monday.validateCredentials();
      if (!isValid) {
        // Try to refresh the token
        accessToken = await handleTokenExpiration(integration);
        if (!accessToken) {
          throw new Error('Token refresh failed');
        }
        // Update the client with new token
        monday.updateToken(accessToken);
      }

      // Verify the board exists and is accessible
      const boardGroups = await monday.getBoardGroups(settings.boardId);
      if (!boardGroups.length) {
        return NextResponse.json({ 
          error: 'Invalid board ID or board not accessible' 
        }, { status: 400 });
      }

      // Update settings
      await db
        .update(organizationIntegrations)
        .set({
          settings: {
            boardId: settings.boardId,
            groupId: settings.groupId || 'leads',
            columnMappings: settings.columnMappings || {}
          },
          updatedAt: new Date()
        })
        .where(eq(organizationIntegrations.id, integration.id));

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('Token refresh failed') || 
           error.message.includes('authentication failed'))) {
        requiresReauth = true;
      }
      
      return NextResponse.json({ 
        error: 'Monday.com authentication failed',
        requiresAuth: true,
        message: error instanceof Error ? error.message : 'Authentication failed'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      requiresAuth: true 
    }, { status: 500 });
  }
}