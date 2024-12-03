import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSessions, getAgentById } from "@/lib/actions";
import { verifyOnboardingToken, createAnonymousToken } from "@/lib/onboarding-auth";
import { AxiosError } from "axios";

// CORS headers with expanded options
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agent-id, x-requested-with',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Access-Control-Allow-Credentials': 'true'
};

// Helper function to create standardized error responses
const createErrorResponse = (
  status: number, 
  message: string, 
  details?: any
) => {
  return NextResponse.json({
    error: message,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
    success: false,
    timestamp: new Date().toISOString()
  }, {
    status,
    headers: corsHeaders
  });
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    // 1. Parameter Validation
    const agentId = req.headers.get('x-agent-id') || req.nextUrl.searchParams.get('agentId');
    if (!agentId) {
      return createErrorResponse(400, "Agent ID required");
    }

    // 2. Get Agent and Organization Info
    const agent = await getAgentById(agentId).catch(error => {
      console.error('Failed to fetch agent:', error);
      throw new Error('Agent fetch failed');
    });

    if (!agent || !agent.site) {
      return createErrorResponse(404, "Agent not found or improperly configured");
    }

    const agentOrgId = agent.site.organizationId;
    if (!agentOrgId) {
      return createErrorResponse(400, "Agent organization not configured");
    }

    // 3. Authentication Checks
    let isAuthenticated = false;
    let authMethod = '';

    // Try server session first
    const serverSession = await getServerSession(authOptions);
    if (serverSession?.organizationId === agentOrgId) {
      isAuthenticated = true;
      authMethod = 'session';
    }

    // If no server session, try onboarding token
    if (!isAuthenticated) {
      const existingToken = req.cookies.get('onboarding_token')?.value;
      if (existingToken) {
        try {
          const verifiedToken = await verifyOnboardingToken(existingToken);
          if (verifiedToken && 
              verifiedToken.agentId === agentId && 
              verifiedToken.organizationId === agentOrgId) {
            isAuthenticated = true;
            authMethod = 'token';
          }
        } catch (e) {
          console.warn('Onboarding token verification failed:', e);
        }
      }
    }

    // 4. Handle Authentication Result
    if (!isAuthenticated) {
      // Check if anonymous auth is allowed
      if (!agent.settings?.authentication?.enabled && agent.settings?.onboardingType === 'external') {
        try {
          // Create new anonymous token
          const newToken = await createAnonymousToken(agentId, agentOrgId);
          const response = NextResponse.json({
            success: true,
            sessions: [], // Return empty sessions for new anonymous users
            metadata: {
              count: 0,
              authMethod: 'anonymous',
              agentId,
              organizationId: agentOrgId
            }
          }, { 
            headers: {
              ...corsHeaders,
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json'
            }
          });

          // Set the token cookie
          response.cookies.set('onboarding_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60,
            path: '/'
          });

          return response;
        } catch (error) {
          console.error('Failed to create anonymous token:', error);
          return createErrorResponse(500, "Failed to create anonymous session");
        }
      }

      return createErrorResponse(401, "Unauthorized", {
        message: "Valid authentication required",
        requiredAuth: agent.settings?.authentication?.enabled ? "password" : "any"
      });
    }

    // 5. Fetch and Return Sessions
    const sessions = await getSessions(agentId, agentOrgId);
    
    // 6. Return Success Response
    return NextResponse.json({
      success: true,
      sessions,
      metadata: {
        count: sessions.length,
        authMethod,
        agentId,
        organizationId: agentOrgId
      }
    }, { 
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    // 7. Error Handling
    console.error('getSessions error:', error);

    if (error instanceof AxiosError) {
      if (error.code === 'ERR_NETWORK') {
        return createErrorResponse(503, "Service temporarily unavailable", {
          retryAfter: 5,
          message: "Network connection failed"
        });
      }
      return createErrorResponse(error.response?.status || 500, error.message);
    }

    return createErrorResponse(
      500,
      "Internal server error",
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}