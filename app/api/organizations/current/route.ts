// app/api/organizations/current/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { organizations, organizationMemberships, users } from '@/lib/schema';

export async function GET(request: Request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch the organization membership for the user
    const membership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId),
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const organizationId = membership.organizationId;

    // Fetch the organization details
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Return the organization details
    return NextResponse.json({ organization }, { status: 200 });

  } catch (error) {
    console.error('Error fetching current organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
