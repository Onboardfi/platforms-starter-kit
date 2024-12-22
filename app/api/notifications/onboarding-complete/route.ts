// app/api/notifications/onboarding-complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Novu } from '@novu/node';
import { withCombinedAuth, AuthState } from '@/lib/combined-auth';
import { db } from '@/lib/db';
import { onboardingSessions, organizationMemberships, agents, sites } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

if (!process.env.NOVU_API_KEY) {
  throw new Error('NOVU_API_KEY is not defined');
}

const novu = new Novu(process.env.NOVU_API_KEY);

async function getOrganizationFromAgent(agentId: string): Promise<string> {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      site: {
        with: {
          organization: true
        }
      }
    }
  });

  if (!agent?.site?.organizationId) {
    throw new Error('Organization not found for agent');
  }

  return agent.site.organizationId;
}

async function getOrganizationMembers(organizationId: string) {
  return await db.query.organizationMemberships.findMany({
    where: eq(organizationMemberships.organizationId, organizationId),
    with: {
      user: true
    }
  });
}

async function ensureSubscriber(subscriberId: string, userData: { 
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  try {
    const subscriberData = {
      email: userData.email,
      firstName: userData.firstName || undefined,
      lastName: userData.lastName || undefined,
      data: {}
    };

    await novu.subscribers.identify(subscriberId, subscriberData);
    console.log('Subscriber created/updated:', subscriberId);
  } catch (error) {
    console.error('Error creating subscriber:', error);
    throw error;
  }
}

function normalizeRole(role: string | null | undefined): string {
  if (!role) return 'member';
  switch (role) {
    case 'owner': return 'owner';
    case 'admin': return 'admin';
    case 'member': return 'member';
    default: return 'member';
  }
}

export async function POST(req: NextRequest) {
  return withCombinedAuth(req, async (userId: string | undefined, agentId: string | undefined) => {
    try {
      // Validate agentId is present
      if (!agentId) {
        return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
      }

      const { sessionId, agentName, totalSteps } = await req.json();

      // Get organization ID through the agent -> site -> organization chain
      let organizationId: string;
      try {
        organizationId = await getOrganizationFromAgent(agentId);
      } catch (error) {
        console.error('Failed to get organization from agent:', error);
        return NextResponse.json({ error: 'Failed to find organization for agent' }, { status: 404 });
      }

      // Get organization members
      const orgMembers = await getOrganizationMembers(organizationId);
      
      if (orgMembers.length === 0) {
        console.error('No organization members found:', organizationId);
        return NextResponse.json({ error: 'Organization members not found' }, { status: 404 });
      }

      // Create/ensure all org members as subscribers and track notification promises
      const notificationPromises = await Promise.all(
        orgMembers.map(async member => {
          if (!member.user.id) {
            console.warn('Skipping member with no user ID:', member);
            return null;
          }
      
          console.log('Processing notification for member:', {
            userId: member.user.id,
            email: member.user.email,
            role: member.role
          });
      
          // First ensure the subscriber exists
          await ensureSubscriber(member.user.id, {
            email: member.user.email,
            firstName: member.user.name?.split(' ')[0],
            lastName: member.user.name?.split(' ').slice(1).join(' ')
          });
      
          const normalizedRole = normalizeRole(member.role);
          console.log('Triggering notification with payload:', {
            subscriberId: member.user.id,
            role: normalizedRole,
            isOwner: normalizedRole === 'owner'
          });
      
          // Then send the notification
          return novu.trigger('onboarding-complete-owner', {
            to: {
              subscriberId: member.user.id
            },
            payload: {
              agentName: agentName || 'Agent',
              completedAt: new Date().toISOString(),
              sessionId,
              completedSteps: totalSteps,
              organizationId,
              role: normalizedRole,
              isOwner: normalizedRole === 'owner',
              isAdmin: normalizedRole === 'admin'
            }
          });
        })
      );

      // Filter out any null results from skipped members
      const results = (await Promise.all(notificationPromises)).filter(Boolean);
      
      console.log('Notifications sent to organization members:', results.length);

      return NextResponse.json({
        success: true,
        notifiedUsers: orgMembers
          .filter(m => m.user.id)
          .map(m => m.user.id)
      });

    } catch (error) {
      console.error('Error sending onboarding completion notification:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to send notification',
          details: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  });
}