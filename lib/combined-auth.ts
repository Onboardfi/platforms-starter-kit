//Users/bobbygilbert/Documents/Github/platforms-starter-kit/lib/combined-auth.ts

import { getToken } from 'next-auth/jwt';
import { JWT } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { verifyOnboardingToken, generateOnboardingToken } from './onboarding-auth';
import { getAgentById } from './actions';
import db from './db';
import { eq, and } from 'drizzle-orm';
import { organizationMemberships, sites } from './schema';

// Extend JWT type to include organization context
// In combined-auth.ts
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    needsOnboarding?: boolean;
    email?: string;
    user?: any;
    sub?: string;
    organizationId?: string | null; // Updated to match other declaration
    organizationRole?: 'owner' | 'admin' | 'member';
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      username?: string | null;
      email: string;
      image: string | null;
    };
    organizationId?: string | null; // Updated to be consistent
    needsOnboarding?: boolean;
  }

  interface User {
    id: string;
    name?: string | null;
    username?: string | null;
    gh_username?: string;
    email: string;
    image?: string | null;
  }
}

// Update TokenPayload interface to match
interface TokenPayload extends JWT {
  userId?: string;
  agentId?: string;
  organizationId?: string | null; // Updated to match JWT declaration
  organizationRole?: 'owner' | 'admin' | 'member';
  isAnonymous?: boolean;
  isAuthenticated?: boolean;
  sessionId?: string;
}

// Update AuthState interface for consistency
interface AuthState {
  userId: string;
  organizationId: string | null; // Updated to be nullable
  organizationRole?: 'owner' | 'admin' | 'member';
  isAuthenticated: boolean;
  isAnonymous: boolean;
  agentId: string;
  sessionId?: string;
}
/**
 * Verify organization access and get role
 */
async function verifyOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<{ hasAccess: boolean; role?: 'owner' | 'admin' | 'member' }> {
  try {
    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.organizationId, organizationId)
      )
    });

    return {
      hasAccess: !!membership,
      role: membership?.role
    };
  } catch (error) {
    console.error('Error verifying organization access:', error);
    return { hasAccess: false };
  }
}

/**
 * withCombinedAuth
 * 
 * A higher-order function to wrap API route handlers with combined authentication.
 * It supports both NextAuth sessions and custom onboarding token-based authentication.
 * Now includes organization context and role-based access control.
 */
export async function withCombinedAuth(
  req: NextRequest,
  handler: (
    userId: string | undefined, 
    agentId: string | undefined, 
    authState?: AuthState
  ) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // 1. Get agent ID from request
    const agentIdFromHeader = req.headers.get('x-agent-id');
    const agentIdFromQuery = req.nextUrl.searchParams.get('agentId');
    const agentId = agentIdFromHeader || agentIdFromQuery;

    if (!agentId) {
      console.warn('Agent ID not provided in headers or query.');
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 }
      );
    }

    console.log(`Agent ID extracted: ${agentId}`);

    // 2. Get agent settings and organization context
    const agent = await getAgentById(agentId);
    if (!agent || !agent.site) {
      console.warn(`Agent not found or missing site: ${agentId}`);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const organizationId = agent.site.organizationId;
    console.log(`Agent found: ${agentId} in organization: ${organizationId}`);

    // 3. Check NextAuth session first
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }) as TokenPayload;
    if (token?.sub) {
      console.log('NextAuth session found:', token);
      
      // Verify organization access
      const { hasAccess, role } = await verifyOrganizationAccess(
        token.sub,
        organizationId
      );

      if (!hasAccess) {
        console.warn(`User ${token.sub} does not have access to organization ${organizationId}`);
        return NextResponse.json(
          { error: 'Organization access denied' },
          { status: 403 }
        );
      }

      const authState: AuthState = {
        userId: token.sub,
        organizationId,
        organizationRole: role,
        isAuthenticated: true,
        isAnonymous: false,
        agentId,
        sessionId: token.sessionId
      };
      return handler(token.sub, agentId, authState);
    }

    // 4. Check onboarding token
    const authToken = req.cookies.get('onboarding_token')?.value;
    if (authToken) {
      console.log('Onboarding token found in cookies');
      const tokenState = await verifyOnboardingToken(authToken);
      
      if (tokenState && tokenState.agentId === agentId) {
        const authState: AuthState = {
          userId: tokenState.userId,
          organizationId,
          isAuthenticated: true,
          isAnonymous: tokenState.isAnonymous || false,
          agentId: tokenState.agentId,
          sessionId: tokenState.sessionId
        };
        
        // For authenticated users, verify organization access
        if (!tokenState.isAnonymous && tokenState.userId !== 'anonymous') {
          const { hasAccess, role } = await verifyOrganizationAccess(
            tokenState.userId,
            organizationId
          );

          if (!hasAccess) {
            return NextResponse.json(
              { error: 'Organization access denied' },
              { status: 403 }
            );
          }

          authState.organizationRole = role;
        }

        console.log('Token verification successful:', authState);
        
        // Special handling for anonymous users with valid tokens
        if (tokenState.userId === 'anonymous' && agent.settings.onboardingType === 'internal') {
          return handler('anonymous', agentId, {
            ...authState,
            isAnonymous: true,
            isAuthenticated: true
          });
        }
        
        return handler(tokenState.userId, agentId, authState);
      } else {
        console.warn('Invalid token or token mismatch for agent:', agentId);
      }
    }

    // 5. Handle unauthenticated access based on agent settings
    const isInternalOnboarding = agent.settings.onboardingType === 'internal';
    const isAuthEnabled = agent.settings.authentication?.enabled;

    if (isInternalOnboarding && isAuthEnabled) {
      console.log('Authentication required for internal onboarding');
      return NextResponse.json(
        { error: 'Authentication required', requiresAuth: true },
        { status: 401 }
      );
    }

    // 6. Allow anonymous access for external onboarding or when auth is disabled
    const authState: AuthState = {
      userId: 'anonymous',
      organizationId,
      isAuthenticated: false,
      isAnonymous: true,
      agentId
    };

    // For external onboarding without auth, create a token
    if (agent.settings.onboardingType === 'external' || !agent.settings.authentication?.enabled) {
      const newToken = await generateOnboardingToken({
        userId: 'anonymous',
        agentId,
        organizationId,
        isAnonymous: true,
        isAuthenticated: false
      });

      const response = NextResponse.json(
        { 
          userId: 'anonymous', 
          organizationId,
          isAuthenticated: false, 
          isAnonymous: true 
        },
        { status: 200 }
      );

      // Set cookie for future requests
      response.cookies.set('onboarding_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 // 24 hours
      });

      return response;
    }

    console.log('Proceeding with anonymous access:', authState);
    return handler(undefined, agentId, authState);

  } catch (error) {
    console.error('withCombinedAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}