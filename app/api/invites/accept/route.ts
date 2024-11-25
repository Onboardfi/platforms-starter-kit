// app/api/invites/accept/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { acceptOrganizationInvite } from '@/lib/organization-invites';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { token } = await req.json();
    
    if (!token) {
      return new NextResponse('Token is required', { status: 400 });
    }

    const result = await acceptOrganizationInvite(token);

    if (!result.success) {
      if (result.requiresSignup) {
        return NextResponse.json({ 
          requiresSignup: true,
          inviteEmail: result.inviteEmail 
        }, { status: 403 });
      }
      return NextResponse.json(
        { error: 'Failed to accept invite' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      organizationId: result.organization?.id
    });

  } catch (error: any) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}