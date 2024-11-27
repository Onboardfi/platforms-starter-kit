// /lib/organization-invites.ts

import { createId } from '@paralleldrive/cuid2';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { OrganizationInviteEmail } from '@/components/emails/organization-invite-email';
import db from '@/lib/db';
import {
  users,
  organizations,
  organizationInvites,
  organizationMemberships,
  type SelectOrganizationInvite
} from '@/lib/schema';
import { getSession } from '@/lib/auth';

// Environment validation
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not configured');
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  console.warn('NEXT_PUBLIC_APP_URL is not set. Defaulting to localhost.');
}

// Constants
const resend = new Resend(process.env.RESEND_API_KEY);
const DEFAULT_INVITE_EXPIRY_DAYS = 7;
const VERIFIED_FROM_EMAIL = 'invite@hello.onboardfi.com';
const SUPPORT_EMAIL = 'support@hello.onboardfi.com';

// Types
export type InviteResult = {
  requiresSignup: boolean;
  organization?: typeof organizations.$inferSelect;
  membership?: typeof organizationMemberships.$inferSelect;
  inviteEmail?: string;
  success?: boolean;
};

// Helper Functions
async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  expiresAt: Date;
}) {
  console.log('Attempting to send invite email:', {
    to: params.to.toLowerCase(),
    from: VERIFIED_FROM_EMAIL,
  });

  try {
    const result = await resend.emails.send({
      from: `Onboardfi <${VERIFIED_FROM_EMAIL}>`,
      replyTo: SUPPORT_EMAIL,
      to: [params.to.toLowerCase()],
      subject: `Join ${params.organizationName} on Onboardfi`,
      react: OrganizationInviteEmail({
        inviterName: params.inviterName,
        organizationName: params.organizationName,
        inviteLink: params.inviteLink,
        expiresAt: params.expiresAt,
      }),
      headers: {
        'X-Entity-Ref-ID': createId(),
      },
      tags: [{ name: 'invite', value: 'organization' }],
    });

    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    throw error;
  }
}

function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

function getInviteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_ENV === 'production' 
      ? 'https://app.onboardfi.com' 
      : 'http://app.localhost:3000');

  // Use the onboarding page with the 'invite' query parameter
  return `${baseUrl}/onboarding?invite=${token}`;
}
// Main Functions
export async function createOrganizationInvite(
  organizationId: string,
  email: string,
  role: 'owner' | 'admin' | 'member' = 'member'
) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  console.log('Creating organization invite:', { organizationId, email, role });

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user and membership
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      const existingMembership = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, existingUser.id)
        )
      });

      if (existingMembership) {
        throw new Error('User is already a member of this organization');
      }
    }

    // Check existing invite
    const existingInvite = await db.query.organizationInvites.findFirst({
      where: and(
        eq(organizationInvites.organizationId, organizationId),
        eq(organizationInvites.email, normalizedEmail),
        eq(organizationInvites.status, 'pending')
      )
    });

    if (existingInvite) {
      throw new Error('An invite has already been sent to this email');
    }

    // Get organization
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId)
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Create invite
    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_INVITE_EXPIRY_DAYS);

    const [invite] = await db
      .insert(organizationInvites)
      .values({
        id: createId(),
        organizationId,
        email: normalizedEmail,
        role,
        token,
        invitedBy: session.user.id,
        expiresAt,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      })
      .returning();

    // Send email
    await sendInviteEmail({
      to: normalizedEmail,
      inviterName: session.user.name || 'A team member',
      organizationName: organization.name,
      inviteLink: getInviteUrl(invite.token),
      expiresAt: invite.expiresAt,
    });

    return invite;
  } catch (error) {
    console.error('Error in createOrganizationInvite:', error);
    throw error;
  }
}



export async function acceptOrganizationInvite(token: string): Promise<InviteResult> {
  const session = await getSession();
  
  try {
    // Fetch and validate the invite
    const invite = await db.query.organizationInvites.findFirst({
      where: and(
        eq(organizationInvites.token, token),
        eq(organizationInvites.status, 'pending')
      ),
      with: {
        organization: true,
      },
    });

    if (!invite) {
      console.error('Invite not found or already processed.');
      throw new Error('Invalid or expired invite');
    }

    if (new Date() > invite.expiresAt) {
      await db
        .update(organizationInvites)
        .set({ status: 'expired' })
        .where(eq(organizationInvites.id, invite.id));
      console.warn('Invite has expired and status updated to expired.');
      throw new Error('Invite has expired');
    }

    // Handle unauthenticated users
    if (!session?.user) {
      console.warn('User is not authenticated. Requires signup.');
      return {
        requiresSignup: true,
        organization: invite.organization,
        inviteEmail: invite.email,
      };
    }

    // Validate email match
    if (session.user.email !== invite.email) {
      console.warn('User email does not match invite email.');
      return {
        requiresSignup: true,
        organization: invite.organization,
        inviteEmail: invite.email,
      };
    }

    // Proceed to create membership within a transaction
    const [membership] = await db.transaction(async (tx) => {
      console.log('Starting transaction to accept invite:', token);

      // Create membership
      const [newMembership] = await tx
        .insert(organizationMemberships)
        .values({
          id: createId(),
          organizationId: invite.organizationId,
          userId: session.user.id,
          role: invite.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log('New Membership Created:', newMembership);

      // Update invite status to 'accepted'
      const updatedInvite = await tx
        .update(organizationInvites)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(organizationInvites.id, invite.id))
        .returning();

      console.log('Invite status updated to accepted:', updatedInvite);

      // Fetch existing user metadata
      const existingUser = await tx.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      if (!existingUser) {
        throw new Error('User not found during metadata update.');
      }

      // Merge existing metadata with new fields
      const updatedMetadata = {
        ...existingUser.metadata,
        needsOnboarding: false,
        organizationId: invite.organizationId,
        lastLoginAt: new Date().toISOString(),
      };

      // Update user metadata
      const updatedUser = await tx
        .update(users)
        .set({
          metadata: updatedMetadata,
        })
        .where(eq(users.id, session.user.id))
        .returning();

      console.log('User metadata updated:', updatedUser);

      return [newMembership];
    });

    console.log('Final Membership:', membership);
    
    return {
      success: true,
      requiresSignup: false,
      organization: invite.organization,
      membership,
      inviteEmail: invite.email,
    };
  } catch (error) {
    console.error('Error in acceptOrganizationInvite:', error);
    throw error;
  }
}


export async function cancelOrganizationInvite(inviteId: string): Promise<SelectOrganizationInvite> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const invite = await db.query.organizationInvites.findFirst({
      where: eq(organizationInvites.id, inviteId)
    });

    if (!invite || invite.status !== 'pending') {
      throw new Error('Invite not found or already processed');
    }

    const [cancelledInvite] = await db
      .update(organizationInvites)
      .set({
        status: 'cancelled',
      })
      .where(eq(organizationInvites.id, inviteId))
      .returning();

    return cancelledInvite;
  } catch (error) {
    console.error('Error in cancelOrganizationInvite:', error);
    throw error;
  }
}