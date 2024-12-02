// /app/api/auth/[...nextauth]/route.ts
import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import db from '@/lib/db';
import { users, organizations, organizationMemberships } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { analytics } from '@/lib/segment';
import { identifyUserWithIntercom } from '@/lib/analytics/intercom';

const handler = NextAuth(authOptions);

async function safeUpdateUserMetadata(userId: string, metadata: any) {
  try {
    // Update user metadata
    await db.update(users)
      .set({ 
        metadata: metadata 
      })
      .where(eq(users.id, userId));

    // Get the user details with their organization membership
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get the user's organization through the organization memberships table
    const orgMembership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId),
      with: {
        organization: true
      }
    });

    // Prepare the user traits
    const userTraits = {
      ...metadata,
      email: user.email,
      name: user.name,
      updatedAt: new Date().toISOString()
    };

    // If the user has an organization, include organization data
    if (orgMembership?.organization) {
      const org = orgMembership.organization;
      
      // Add role information from the membership
      const enrichedUserTraits = {
        ...userTraits,
        role: orgMembership.role,
        organizationId: org.id,
        organizationName: org.name
      };
      
      identifyUserWithIntercom(
        userId,
        enrichedUserTraits,
        org.id,
        {
          name: org.name,
          tier: org.metadata?.stripe?.subscription?.metadata?.tier,
          memberCount: orgMembership.organization.metadata?.memberCount,
          industry: org.metadata?.industry,
          updatedAt: new Date().toISOString()
        }
      );
    } else {
      // If no organization, just identify the user
      identifyUserWithIntercom(userId, userTraits);
    }

    // Keep the original Segment server-side tracking
    analytics.identify({
      userId: userId,
      traits: metadata,
    });

  } catch (error) {
    console.error('Failed to update user metadata:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

export { handler as GET, handler as POST };