// app/api/sites/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { sites } from '@/lib/schema';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch sites belonging to the user's organization
    const userSites = await db.query.sites.findMany({
      where: eq(sites.organizationId, session.organizationId),
    });

    return NextResponse.json(userSites);
  } catch (error) {
    console.error('Error fetching user sites:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
