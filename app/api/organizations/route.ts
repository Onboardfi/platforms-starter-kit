// app/api/organizations/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { organizations, organizationMemberships } from '@/lib/schema';
import { createId } from '@paralleldrive/cuid2';
import { stripe } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import { OrganizationMetadata } from '@/lib/schema';
import { revalidatePath } from 'next/cache';

// Types
interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  metadata: OrganizationMetadata;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId?: string;
}

// Helper functions
function generateSlug(name: string): string {
  return `org-${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

// Main API handler
export async function POST(req: Request) {
  console.log('Organizations API - Received create organization request');
  
  try {
    // 1. Validate session
    const session = await getSession();
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { name, metadata } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // 3. Generate and validate slug
    const slug = body.slug || generateSlug(name);
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug)
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 409 }
      );
    }

    // 4. Prepare organization data
    const orgId = createId();
    const now = new Date();
    
    const orgData = {
      id: orgId,
      name: name.trim(),
      slug,
      createdBy: session.user.id,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now
    };

    // 5. Execute transaction
    console.log('Organizations API - Starting transaction for organization creation');
    
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [org] = await tx
        .insert(organizations)
        .values(orgData)
        .returning();

      // Create owner membership
      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          id: createId(),
          organizationId: org.id,
          userId: session.user.id,
          role: 'owner',
          createdAt: now,
          updatedAt: now
        })
        .returning();

      // Handle Stripe integration
      if (stripe) {
        console.log('Organizations API - Creating Stripe customer');
        
        const customer = await stripe.customers.create({
          email: session.user.email || undefined,
          metadata: {
            organizationId: org.id,
            userId: session.user.id,
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
      }

      return {
        organization: org,
        membership
      };
    });

    // 6. Revalidate relevant paths
    revalidatePath('/app/dashboard');
    revalidatePath('/app/settings');

    console.log('Organizations API - Organization created successfully:', result.organization.id);

    // 7. Return simplified response with just what the client needs
    return NextResponse.json({
      id: result.organization.id, // This is the key change - returning id directly at the top level
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
        { error: error.message || 'Failed to create organization' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An error occurred while creating the organization' },
      { status: 500 }
    );
  }
}