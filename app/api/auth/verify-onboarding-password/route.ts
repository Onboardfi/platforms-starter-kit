// app/api/auth/verify-onboarding-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { generateOnboardingToken } from "@/lib/onboarding-auth";
import { getAgentById } from "@/lib/actions";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { agentId, password, anonymous = false } = await req.json();

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Ensure agent.site exists
    if (!agent.site) {
      console.warn(`Agent ${agentId} does not have an associated site.`);
      return NextResponse.json({ error: "Agent's site not found" }, { status: 400 });
    }

    // Retrieve organizationId from the agent's site
    const organizationId = agent.site.organizationId;

    // Handle anonymous authentication request
    if (anonymous) {
      if (agent.settings.onboardingType === 'internal' && agent.settings.authentication?.enabled) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      const anonymousToken = await generateOnboardingToken({
        userId: 'anonymous',
        agentId,
        organizationId, // Added organizationId
        isAnonymous: true,
        isAuthenticated: false
      });

      const response = NextResponse.json({ 
        success: true,
        message: "Anonymous authentication successful"
      });

      response.cookies.set('onboarding_token', anonymousToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      });

      return response;
    }

    // Handle password authentication
    if (!agent.settings.authentication?.enabled) {
      return NextResponse.json({ error: "Authentication not enabled" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(
      password,
      agent.settings.authentication.password || ""
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Create authenticated token for the user
    const token = await generateOnboardingToken({
      userId: `user-${Date.now()}`,
      agentId,
      organizationId, // Added organizationId
      isAnonymous: false,
      isAuthenticated: true
    });

    const response = NextResponse.json({ 
      success: true,
      message: "Authentication successful"
    });

    response.cookies.set('onboarding_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error("Password verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}
