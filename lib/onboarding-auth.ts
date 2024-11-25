// /lib/onboarding-auth.ts

import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT, JWTPayload } from 'jose';
import { nanoid } from 'nanoid';
import { getAgentById } from '@/lib/actions';
import { organizationMemberships } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import db from './db';
import { acceptOrganizationInvite } from './organization-invites'; // Import the accept function

const JWT_SECRET = process.env.NEXTAUTH_SECRET || '';

export interface TokenPayload {
  userId: string;
  agentId: string;
  organizationId: string; // Add organization context
  organizationRole?: 'owner' | 'admin' | 'member'; // Add role context
  isAnonymous: boolean;
  isAuthenticated: boolean;
  sessionId?: string;
  jti?: string;
  exp?: number;
}

interface JWTOnboardingPayload extends JWTPayload, TokenPayload {}

export interface OnboardingAuthResponse {
  success: boolean;
  error?: string;
  token?: string;
  authState?: TokenPayload;
  requiresAuth?: boolean;
}

/**
 * Verify organization access and get role
 */
async function verifyOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<{ hasAccess: boolean; role?: 'owner' | 'admin' | 'member' }> {
  try {
    if (userId === 'anonymous') {
      return { hasAccess: true };
    }

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
 * Generates a new onboarding token
 */
export async function generateOnboardingToken(payload: TokenPayload): Promise<string> {
  const jti = nanoid();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (24 * 60 * 60); // 24 hours

  const jwtPayload: JWTOnboardingPayload = {
    ...payload,
    jti,
    iat: now,
    exp
  };

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET));
  
  return token;
}

/**
 * Verifies an onboarding token
 */
export async function verifyOnboardingToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    function isValidPayload(payload: JWTPayload): payload is JWTOnboardingPayload {
      const p = payload as JWTOnboardingPayload;
      return (
        typeof p === 'object' &&
        p !== null &&
        typeof p.userId === 'string' &&
        typeof p.agentId === 'string' &&
        typeof p.organizationId === 'string' &&
        typeof p.isAuthenticated === 'boolean' &&
        typeof p.isAnonymous === 'boolean'
      );
    }

    if (!isValidPayload(payload)) {
      console.error('Invalid token payload structure:', payload);
      return null;
    }

    return {
      userId: payload.userId,
      agentId: payload.agentId,
      organizationId: payload.organizationId,
      organizationRole: payload.organizationRole,
      isAuthenticated: payload.isAuthenticated,
      isAnonymous: payload.isAnonymous,
      sessionId: payload.sessionId
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Creates a new anonymous token
 */
export async function createAnonymousToken(agentId: string, organizationId: string): Promise<string> {
  return generateOnboardingToken({
    userId: 'anonymous',
    agentId,
    organizationId,
    isAnonymous: true,
    isAuthenticated: false
  });
}

/**
 * Sets an onboarding token cookie
 */
export function setOnboardingTokenCookie(
  response: NextResponse,
  token: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    path?: string;
  } = {}
): void {
  const {
    httpOnly = true,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    maxAge = 24 * 60 * 60,
    path = '/'
  } = options;

  response.cookies.set('onboarding_token', token, {
    httpOnly,
    secure,
    sameSite,
    maxAge,
    path
  });
}

/**
 * Verifies and processes onboarding authentication
 */
export async function processOnboardingAuth(
  req: NextRequest,
  agentId: string
): Promise<OnboardingAuthResponse> {
  try {
    // Get agent settings
    const agent = await getAgentById(agentId);
    if (!agent || !agent.site) {
      return { success: false, error: 'Agent not found' };
    }

    const organizationId = agent.site.organizationId;

    // Check existing token
    const token = req.cookies.get('onboarding_token')?.value;
    if (token) {
      const tokenState = await verifyOnboardingToken(token);
      if (tokenState && tokenState.agentId === agentId) {
        // Verify organization access if authenticated
        if (!tokenState.isAnonymous) {
          const { hasAccess, role } = await verifyOrganizationAccess(
            tokenState.userId,
            organizationId
          );

          if (!hasAccess) {
            return { 
              success: false, 
              error: 'Organization access denied',
              requiresAuth: true
            };
          }

          tokenState.organizationRole = role;
        }

        return { 
          success: true, 
          token,
          authState: tokenState
        };
      }
    }

    // Handle based on agent settings
    const isInternalOnboarding = agent.settings.onboardingType === 'internal';
    const isAuthEnabled = agent.settings.authentication?.enabled;

    if (isInternalOnboarding && isAuthEnabled) {
      return { 
        success: false, 
        error: 'Authentication required',
        requiresAuth: true 
      };
    }

    // Create anonymous token for external onboarding
    const newToken = await createAnonymousToken(agentId, organizationId);
    return { 
      success: true, 
      token: newToken,
      authState: {
        userId: 'anonymous',
        agentId,
        organizationId,
        isAnonymous: true,
        isAuthenticated: false
      }
    };

  } catch (error) {
    console.error('Auth processing error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Gets the current onboarding auth state
 */
export async function getOnboardingAuthState(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get('onboarding_token')?.value;
  if (!token) return null;
  return verifyOnboardingToken(token);
}
