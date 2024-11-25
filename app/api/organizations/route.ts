import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { organizations, organizationMemberships, users } from '@/lib/schema';
import { createId } from '@paralleldrive/cuid2';
import { stripe } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import { OrganizationMetadata } from '@/lib/schema';
import { revalidatePath } from 'next/cache';

// Helper function to merge and update user metadata
async function updateUserMetadata(userId: string, newMetadata: Partial<Record<string, any>>) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { metadata: true },
    });
    
    // Ensure we have an object to work with
    const existingMetadata = user?.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...newMetadata,
      updatedAt: new Date().toISOString()
    };
    
    await db.update(users)
      .set({ metadata: updatedMetadata })
      .where(eq(users.id, userId));
      
    return true;
  } catch (error) {
    console.error('Failed to update user metadata:', error);
    return false;
  }
}

// Helper function to generate a unique slug
function generateSlug(name: string): string {
  const timestamp = Date.now();
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `org-${timestamp}-${sanitizedName}`.slice(0, 50);
}

// Main API handler
export async function POST(req: Request) {
  console.log('Organizations API - Received create organization request');
  
  try {
    // 1. Get and validate session with explicit authOptions
    const session = await getServerSession(authOptions);
    
    // Enhanced session logging
    console.log('Organizations API - Session details:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email,
      sessionData: JSON.stringify(session, null, 2)
    });
    
    // Improved session validation
    if (!session) {
      console.error('Organizations API - No session found');
      return NextResponse.json(
        { error: "No session found" },
        { status: 401 }
      );
    }

    if (!session.user) {
      console.error('Organizations API - No user in session');
      return NextResponse.json(
        { error: "No user found in session" },
        { status: 401 }
      );
    }

    if (!session.user.id) {
      console.error('Organizations API - No user ID in session');
      return NextResponse.json(
        { error: "No user ID found" },
        { status: 401 }
      );
    }

    // 2. Verify user exists in database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    });

    if (!user) {
      console.error('Organizations API - User not found in database');
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const { name, metadata = {} } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // 4. Generate and validate slug
    const slug = generateSlug(name);
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug)
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 409 }
      );
    }

    // 5. Prepare organization data
    const orgId = createId();
    const now = new Date();
    
    const orgData = {
      id: orgId,
      name: name.trim(),
      slug,
      createdBy: user.id, // Use verified user ID
      metadata: {
        ...metadata,
        createdAt: now.toISOString(),
      },
      createdAt: now,
      updatedAt: now
    };

    console.log('Organizations API - Creating organization with data:', orgData);

    // 6. Execute transaction with enhanced error handling
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [org] = await tx
        .insert(organizations)
        .values(orgData)
        .returning();

      if (!org) {
        throw new Error('Failed to create organization record');
      }

      // Create owner membership
      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          id: createId(),
          organizationId: org.id,
          userId: user.id,
          role: 'owner',
          createdAt: now,
          updatedAt: now
        })
        .returning();

      if (!membership) {
        throw new Error('Failed to create organization membership');
      }

      // Handle Stripe integration if enabled
      if (stripe) {
        try {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              organizationId: org.id,
              userId: user.id,
            },
            name: org.name,
          });

          await tx
            .update(organizations)
            .set({ 
              stripeCustomerId: customer.id,
              updatedAt: now
            })
            .where(eq(organizations.id, org.id));
            
          org.stripeCustomerId = customer.id;
        } catch (error) {
          console.error('Failed to create Stripe customer:', error);
        }
      }

      // Update user metadata
      const userMetadataUpdate = {
        organizationId: org.id,
        needsOnboarding: false,
        lastOrganizationCreatedAt: now.toISOString(),
      };

      const metadataUpdated = await updateUserMetadata(user.id, userMetadataUpdate);
      
      if (!metadataUpdated) {
        console.warn('Failed to update user metadata, but organization was created');
      }

      return {
        organization: org,
        membership
      };
    });

    // 7. Revalidate cached paths
    revalidatePath('/app/dashboard');
    revalidatePath('/app/settings');
    revalidatePath('/app/organization');

    console.log('Organizations API - Organization created successfully:', result.organization.id);

    // 8. Return response
    return NextResponse.json({
      id: result.organization.id,
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        metadata: result.organization.metadata
      },
      membership: {
        role: result.membership.role
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (error: any) {
    console.error('Organizations API - Error creating organization:', error);
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: error.message || 'Failed to create organization',
          stack: error.stack
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An error occurred while creating the organization' },
      { status: 500 }
    );
  }
}