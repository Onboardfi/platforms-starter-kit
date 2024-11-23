//Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/lib/data/organizations.ts

import { eq, and, or } from 'drizzle-orm';
import db from '@/lib/db';
import { organizations, organizationMemberships, users } from '@/lib/schema';
import type { 
  SelectOrganization, 
  SelectOrganizationWithRelations,
  SelectOrganizationMembership 
} from '@/lib/schema';

interface GetUserOrganizationsOptions {
  includeRelations?: boolean;
  role?: 'owner' | 'admin' | 'member';
}

/**
 * Get all organizations a user is a member of
 */
export async function getUserOrganizations(
  userId: string,
  options: GetUserOrganizationsOptions = {}
): Promise<SelectOrganizationWithRelations[]> {
  const { includeRelations = false, role } = options;

  const query = db.query.organizationMemberships.findMany({
    where: and(
      eq(organizationMemberships.userId, userId),
      role ? eq(organizationMemberships.role, role) : undefined
    ),
    with: {
      organization: {
        with: includeRelations ? {
          sites: true,
          creator: true,
          memberships: {
            with: {
              user: true
            }
          }
        } : undefined
      }
    }
  });

  const memberships = await query;
  return memberships.map(m => m.organization);
}

/**
 * Get user's primary (owner) organization
 */
export async function getUserPrimaryOrganization(
  userId: string
): Promise<SelectOrganization | null> {
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.role, 'owner')
    ),
    with: {
      organization: true
    }
  });

  return membership?.organization || null;
}

/**
 * Check user's role in an organization
 */
export async function checkUserOrganizationRole(
  userId: string,
  organizationId: string,
  roles: ('owner' | 'admin' | 'member')[] = ['owner', 'admin', 'member']
): Promise<boolean> {
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, organizationId),
      roles.length > 0 
        ? or(...roles.map(role => eq(organizationMemberships.role, role)))
        : undefined
    )
  });

  return !!membership;
}

/**
 * Get all members of an organization with their roles
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<(SelectOrganizationMembership & { user: typeof users.$inferSelect })[]> {
  return db.query.organizationMemberships.findMany({
    where: eq(organizationMemberships.organizationId, organizationId),
    with: {
      user: true
    },
    orderBy: (members, { desc }) => [
      desc(members.role),
      desc(members.createdAt)
    ]
  });
}

/**
 * Check if user has admin access to an organization
 */
export async function hasOrganizationAdminAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return checkUserOrganizationRole(userId, organizationId, ['owner', 'admin']);
}

/**
 * Check if user is the organization owner
 */
export async function isOrganizationOwner(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return checkUserOrganizationRole(userId, organizationId, ['owner']);
}

/**
 * Create a new organization
 */
export async function createOrganization(
  name: string,
  userId: string,
  slug?: string
): Promise<SelectOrganization> {
  // Create the organization
  const [organization] = await db
    .insert(organizations)
    .values({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      createdBy: userId,
    })
    .returning();

  // Create the ownership membership
  await db.insert(organizationMemberships).values({
    organizationId: organization.id,
    userId,
    role: 'owner',
  });

  return organization;
}

/**
 * Get all organizations with optional filtering
 */
export async function getOrganizations(
  where: Partial<typeof organizations.$inferSelect> = {},
  includeRelations = false
) {
  const conditions = Object.entries(where).map(
    ([key, value]) => eq(organizations[key as keyof typeof organizations], value)
  );

  return db.query.organizations.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: includeRelations ? {
      memberships: {
        with: {
          user: true
        }
      },
      sites: true,
      creator: true
    } : undefined
  });
}