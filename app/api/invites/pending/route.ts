// app/api/invites/pending/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';
import db from '@/lib/db';
import { organizationInvites, organizations, users } from '@/lib/schema';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const pendingInvites = await db.query.organizationInvites.findMany({
      where: and(
        eq(organizationInvites.email, session.user.email),
        eq(organizationInvites.status, 'pending')
      ),
      with: {
        organization: true,
        inviter: true
      }
    });

    const formattedInvites = pendingInvites.map(invite => ({
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      inviterName: invite.inviter?.name || 'A team member',
      role: invite.role,
      token: invite.token
    }));

    return NextResponse.json({ invites: formattedInvites });

  } catch (error: any) {
    console.error('Error fetching pending invites:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}