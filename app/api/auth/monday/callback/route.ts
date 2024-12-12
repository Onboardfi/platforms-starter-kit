// app/api/auth/monday/callback/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { organizationIntegrations } from '@/lib/schema';
import { createId } from '@paralleldrive/cuid2';
import { cookies } from 'next/headers';
import { MondayOAuthClient } from '@/lib/monday/oauth-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Verify state and get organizationId from cookies
  const storedState = cookies().get('monday_oauth_state')?.value;
  const organizationId = cookies().get('monday_org_id')?.value;

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL('/integrations?error=invalid_state', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  if (!organizationId) {
    return NextResponse.redirect(
      new URL('/integrations?error=missing_org', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/integrations?error=missing_code', process.env.NEXT_PUBLIC_APP_URL!)
    );
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
        eq(organizationIntegrations.organizationId, organizationId),
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
          organizationId,
          provider: 'monday',
          accessToken: access_token,
          tokenType: token_type,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }

    // Clean up OAuth cookies
    cookies().delete('monday_oauth_state');
    cookies().delete('monday_org_id');

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