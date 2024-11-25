// lib/actions/accept-invite.ts

import { createId } from '@paralleldrive/cuid2';
import { getSession } from "@/lib/auth";
import { eq, and } from 'drizzle-orm';
import db from '@/lib/db';
import { 
  organizationInvites, 
  organizationMemberships,
  users,
  type SelectOrganizationInvite 
} from '@/lib/schema';
import { revalidatePath } from 'next/cache';

interface InviteResult {
  success: boolean;
  error?: string;
  organizationId?: string;
  requiresSignup?: boolean;
  inviteEmail?: string;
}

export async function acceptInvite(token: string): Promise<InviteResult> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return {
      success: false,
      error: "Authentication required"
    };
  }

  console.log(`Accepting invite with token: ${token} for user ID: ${session.user.id}`);

  try {
    // 1. Fetch and validate the invite
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

    console.log(`Found invite: ${invite.id} for organization: ${invite.organizationId}`);

    if (new Date() > invite.expiresAt) {
      await db
        .update(organizationInvites)
        .set({ status: 'expired' })
        .where(eq(organizationInvites.id, invite.id));
      console.warn('Invite has expired and status updated to expired.');
      throw new Error('Invite has expired');
    }

    // 2. Validate email match
    if (session.user.email !== invite.email) {
      console.warn(`User email mismatch: invite email (${invite.email}) vs user email (${session.user.email})`);
      return {
        success: false,
        requiresSignup: true,
        inviteEmail: invite.email
      };
    }

    // 3. Proceed to create membership within a transaction
    const [membership] = await db.transaction(async (tx) => {
      console.log('Starting transaction to accept invite.');

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

      if (!newMembership) {
        throw new Error('Failed to create organization membership.');
      }

      console.log(`Created organization membership: ${newMembership.id}`);

      // Update invite status to 'accepted'
      const [updatedInvite] = await tx
        .update(organizationInvites)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(organizationInvites.id, invite.id))
        .returning();

      console.log(`Updated invite status to accepted: ${updatedInvite.status}`);

      // Fetch existing user metadata
      const existingUser = await tx.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      if (!existingUser) {
        throw new Error('User not found during metadata update.');
      }

      console.log(`Existing user metadata before update: ${JSON.stringify(existingUser.metadata)}`);

      // Merge existing metadata with new fields
      const updatedMetadata = {
        ...existingUser.metadata,
        needsOnboarding: false,
        organizationId: invite.organizationId,
        lastLoginAt: new Date().toISOString(),
      };

      // Update user metadata
      const [updatedUser] = await tx
        .update(users)
        .set({
          metadata: updatedMetadata,
        })
        .where(eq(users.id, session.user.id))
        .returning();

      console.log(`Updated user metadata: ${JSON.stringify(updatedUser.metadata)}`);

      return [newMembership];
    });

    console.log(`Final Membership: ${membership.id}`);

    // 4. Revalidate necessary paths
    revalidatePath('/');
    revalidatePath('/');
    revalidatePath('/');

    return {
      success: true,
      organizationId: invite.organizationId
    };

  } catch (error: any) {
    console.error('Error accepting invite:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept invite'
    };
  }
}
