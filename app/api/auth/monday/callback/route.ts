// app/api/auth/monday/callback/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { organizationIntegrations } from '@/lib/schema';
import { createId } from '@paralleldrive/cuid2';
import { getSession } from '@/lib/auth';
import { MondayOAuthClient } from '@/lib/monday/oauth-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    const currentHost = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const redirectUri = `${protocol}://${currentHost}/api/auth/monday/callback`;

    const client = new MondayOAuthClient({
      clientId: process.env.MONDAY_CLIENT_ID!,
      clientSecret: process.env.MONDAY_CLIENT_SECRET!,
      redirectUri
    });

    const { access_token, token_type } = await client.exchangeCodeForToken(code);

    // Update or create integration record
    const existingIntegration = await db.query.organizationIntegrations.findFirst({
      where: and(
        eq(organizationIntegrations.organizationId, session.organizationId),
        eq(organizationIntegrations.provider, 'monday')
      )
    });

    if (existingIntegration) {
      await db
        .update(organizationIntegrations)
        .set({
          accessToken: access_token,
          tokenType: token_type,
          updatedAt: new Date()
        })
        .where(eq(organizationIntegrations.id, existingIntegration.id));
    } else {
      await db
        .insert(organizationIntegrations)
        .values({
          id: createId(),
          organizationId: session.organizationId,
          provider: 'monday',
          accessToken: access_token,
          tokenType: token_type,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }

    return NextResponse.redirect(
      new URL('/integrations?monday_connected=true', process.env.NEXT_PUBLIC_APP_URL!)
    );
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      new URL('/integrations?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}