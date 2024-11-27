// lib/utils/type-guards.ts

import { Session } from 'next-auth';

/**
 * Type guard to check if a session has a valid organization context
 */
export function hasValidOrganization(
  session: Session | null
): session is Session & { organizationId: string } {
  return !!session?.organizationId;
}

/**
 * Type guard to check if a session has all required organization data
 */
export function hasCompleteOrganizationContext(
  session: Session | null
): session is Session & { organizationId: string; needsOnboarding: boolean } {
  return !!session?.organizationId && typeof session.needsOnboarding === 'boolean';
}

/**
 * Type guard to check if user is authenticated
 */
export function isAuthenticated(
  session: Session | null
): session is Session & { user: { id: string } } {
  return !!session?.user?.id;
}

/**
 * Type guard for error responses
 */
export function isErrorResponse(response: any): response is { error: string } {
  return response && typeof response.error === 'string';
}