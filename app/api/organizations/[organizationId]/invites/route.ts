// /app/api/organizations/[organizationId]/invites/route.ts

import { NextResponse } from 'next/server';
import { 
  createOrganizationInvite, 
  cancelOrganizationInvite,
  acceptOrganizationInvite 
} from '@/lib/organization-invites';
import { getSession } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id || !session.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ensure the organizationId in params matches the user's organizationId
    if (params.organizationId !== session.organizationId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { email, role } = await req.json();
    
    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
    }

    const invite = await createOrganizationInvite(
      params.organizationId,
      email,
      role || 'member'
    );

    return NextResponse.json(invite);
  } catch (error) {
    console.error('[ORGANIZATION_INVITE]', error);
    return new NextResponse(error instanceof Error ? error.message : "Internal Error", { 
      status: error instanceof Error ? 400 : 500 
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id || !session.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ensure the organizationId in params matches the user's organizationId
    if (params.organizationId !== session.organizationId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { inviteId } = await req.json();
    
    if (!inviteId) {
      return new NextResponse("Invite ID is required", { status: 400 });
    }

    const cancelledInvite = await cancelOrganizationInvite(inviteId);

    return NextResponse.json(cancelledInvite);
  } catch (error) {
    console.error('[ORGANIZATION_INVITE_CANCEL]', error);
    return new NextResponse(error instanceof Error ? error.message : "Internal Error", { 
      status: error instanceof Error ? 400 : 500 
    });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getSession();
    const { token } = await req.json();
    
    if (!token) {
      return new NextResponse("Token is required", { status: 400 });
    }

    // Pass just the token - the acceptance logic is handled in the function
    const result = await acceptOrganizationInvite(token);

    if (result.requiresSignup) {
      return NextResponse.json({ 
        requiresSignup: true,
        inviteEmail: result.inviteEmail 
      });
    }

    if (!result.membership) {
      return new NextResponse("Failed to accept invite", { status: 400 });
    }

    return NextResponse.json({
      success: true,
      membership: result.membership,
      organization: result.organization
    });
  } catch (error) {
    console.error('[ORGANIZATION_INVITE_ACCEPT]', error);
    if (error instanceof Error && error.message.includes('email mismatch')) {
      return new NextResponse("Email mismatch", { status: 400 });
    }
    return new NextResponse(error instanceof Error ? error.message : "Internal Error", { 
      status: error instanceof Error ? 400 : 500 
    });
  }
}