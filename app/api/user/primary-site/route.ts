// app/api/user/primary-site/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { sites } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the first site for the organization
    const site = await db.query.sites.findFirst({
      where: eq(sites.organizationId, session.organizationId),
      with: {
        organization: true,
        creator: true,
      },
    });

    return NextResponse.json({ site });
  } catch (error) {
    console.error('[PRIMARY_SITE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}