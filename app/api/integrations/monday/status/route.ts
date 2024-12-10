// app/api/integrations/monday/status/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { organizationIntegrations } from '@/lib/schema';

export async function GET() {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const integration = await db.query.organizationIntegrations.findFirst({
      where: and(
        eq(organizationIntegrations.organizationId, session.organizationId),
        eq(organizationIntegrations.provider, 'monday')
      )
    });

    return NextResponse.json({
      connected: !!integration?.accessToken,
      settings: integration?.settings || {}
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}