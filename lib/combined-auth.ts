// lib/combined-auth.ts

import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { verifyOnboardingToken, generateOnboardingToken } from './onboarding-auth';
import { getAgentById } from './actions';

export interface AuthState {
  userId: string;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  agentId: string;
  sessionId?: string;
}

/**
 * withCombinedAuth
 * 
 * A higher-order function to wrap API route handlers with combined authentication.
 * It supports both NextAuth sessions and custom onboarding token-based authentication.
 * 
 * @param req - The incoming Next.js API request.
 * @param handler - The handler function to execute if authentication is successful.
 * @returns A Promise resolving to a NextResponse.
 */
export async function withCombinedAuth(
  req: NextRequest,
  handler: (userId: string | undefined, agentId: string | undefined, authState?: AuthState) => Promise<NextResponse>
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

    // 2. Get agent settings
    const agent = await getAgentById(agentId);
    if (!agent) {
      console.warn(`Agent not found: ${agentId}`);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    console.log(`Agent found: ${agentId} with settings:`, agent.settings);

    // 3. Check NextAuth session first
    const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (sessionToken?.sub) {
      console.log('NextAuth session found:', sessionToken);
      const authState: AuthState = {
        userId: sessionToken.sub,
        isAuthenticated: true,
        isAnonymous: false,
        agentId,
        sessionId: (sessionToken as any).sessionId
      };
      return handler(sessionToken.sub, agentId, authState);
    }

    // 4. Check onboarding token
    const authToken = req.cookies.get('onboarding_token')?.value;
    if (authToken) {
      console.log('Onboarding token found in cookies');
      const tokenState = await verifyOnboardingToken(authToken);
      
      if (tokenState && tokenState.agentId === agentId) {
        const authState: AuthState = {
          userId: tokenState.userId,
          isAuthenticated: true,
          isAnonymous: tokenState.isAnonymous || false,
          agentId: tokenState.agentId,
          sessionId: tokenState.sessionId
        };
        console.log('Token verification successful:', authState);
        
        // Special handling for anonymous users with valid tokens
        if (tokenState.userId === 'anonymous' && agent.settings.onboardingType === 'internal') {
          const authState: AuthState = {
            userId: 'anonymous',
            isAuthenticated: true,
            isAnonymous: true,
            agentId,
            sessionId: tokenState.sessionId
          };
          return handler('anonymous', agentId, authState);
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
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 6. Allow anonymous access for external onboarding or when auth is disabled
    const authState: AuthState = {
      userId: 'anonymous',
      isAuthenticated: false,
      isAnonymous: true,
      agentId
    };

    // For external onboarding without auth, create a token
    if (agent.settings.onboardingType === 'external' || !agent.settings.authentication?.enabled) {
        const newToken = await generateOnboardingToken({
            userId: 'anonymous',
            agentId,
            isAnonymous: true,
            isAuthenticated: false // Add this line
          });
      const response = NextResponse.json(
        { userId: 'anonymous', isAuthenticated: false, isAnonymous: true },
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

export async function clearOnboardingAuth(req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('onboarding_token');
  return response;
}