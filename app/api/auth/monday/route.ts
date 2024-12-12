// app/api/auth/monday/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { MondayOAuthClient } from '@/lib/monday/oauth-client';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountSlug = searchParams.get('account');
  const forceAccount = searchParams.get('force') === 'true';

  const currentHost = request.headers.get('host') || '';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const redirectUri = `${protocol}://${currentHost}/api/auth/monday/callback`;

  const client = new MondayOAuthClient({
    clientId: process.env.MONDAY_CLIENT_ID!,
    clientSecret: process.env.MONDAY_CLIENT_SECRET!,
    redirectUri
  });

  const state = client.generateState();
  
  // Store state and organizationId in cookies for verification
  cookies().set('monday_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600 // 1 hour
  });
  
  cookies().set('monday_org_id', session.organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600
  });

  try {
    const authUrl = client.getAuthorizationUrl(
      ['boards:read', 'boards:write'],
      {
        state,
        accountSlug,
        forceAccount
      }
    );

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      new URL('/integrations?error=invalid_configuration', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}