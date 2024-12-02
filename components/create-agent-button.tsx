import { useTransition } from "react";
import { createAgent } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import LoadingDots from "@/components/icons/loading-dots";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { AgentSettings, SelectSite } from "@/lib/schema";
import { useSession } from "next-auth/react";
import { createId } from "@paralleldrive/cuid2";
import { analyticsClient } from '@/lib/analytics';

// Define the props interface for our component
interface CreateAgentButtonProps {
  siteId: string;
}

// Type guard to ensure session has required data
// This helps TypeScript understand when our session object is properly formed
function hasRequiredSessionData(
  session: any
): session is { organizationId: string; user: { id: string; email: string } } {
  return Boolean(
    session?.organizationId &&
    session?.user?.id &&
    session?.user?.email
  );
}

// Helper to get analytics context with safe type checking
// This ensures we collect consistent analytics data across all events
const getAnalyticsContext = () => ({
  location: typeof window !== 'undefined' ? window.location.pathname : undefined,
  referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  viewport: typeof window !== 'undefined' ? {
    width: window.innerWidth,
    height: window.innerHeight
  } : undefined,
  deviceType: typeof window !== 'undefined' ? 
    window.innerWidth < 768 ? 'mobile' : 'desktop' : undefined,
  timestamp: new Date().toISOString()
});

export default function CreateAgentButton({ siteId }: CreateAgentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();

  // Early return if session lacks required data
  if (!hasRequiredSessionData(session)) {
    return null;
  }

  // Now TypeScript knows these values are definitely strings
  const organizationId = session.organizationId;
  const userId = session.user.id;

  const handleCreateAgent = async () => {
    const startTime = Date.now();
    const orgSlug = `org-${createId()}`;

    // Track creation attempt
    analyticsClient.track("Agent Creation Started", {
      ...getAnalyticsContext(),
      organizationId,
      userId,
      siteId
    });

    try {
      const site: SelectSite = {
        id: siteId,
        name: null,
        description: null,
        logo: null,
        font: "font-cal",
        image: null,
        imageBlurhash: null,
        subdomain: null,
        customDomain: null,
        message404: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        createdBy: userId,
        organization: {
          id: organizationId,
          name: "Default Organization",
          slug: orgSlug,
          createdBy: userId,
          logo: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          metadata: {
            companySize: "small",
            industry: "",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        creator: {
          id: userId,
          name: session.user.name || null,
          username: null,
          gh_username: null,
          email: session.user.email,
          emailVerified: null,
          image: session.user.image || null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const response = await createAgent(new FormData(), site);
      
      if (response.error) {
        // Track creation failure with detailed error information
        analyticsClient.track("Agent Creation Failed", {
          ...getAnalyticsContext(),
          organizationId,
          userId,
          siteId,
          error: response.error,
          duration: Date.now() - startTime
        });
        
        toast.error(response.error);
      } else if (response.id) {
        // Track successful creation with timing and context
        analyticsClient.track("Agent Created", {
          ...getAnalyticsContext(),
          organizationId,
          userId,
          siteId,
          agentId: response.id,
          duration: Date.now() - startTime
        });

        // Update user traits to reflect the new agent creation
        analyticsClient.identify(userId, {
          lastAgentCreatedAt: new Date().toISOString(),
          totalAgentsCreated: 1, // Initial count since we can't access current count
        });

        // Update organization traits with new agent information
        analyticsClient.group(organizationId, {
          name: site.organization.name,
          totalAgents: 1, // Initial count since we can't access current count
          lastAgentCreatedAt: new Date().toISOString()
        });

        // Navigate to the new agent's page and show success message
        router.refresh();
        router.push(`/agent/${response.id}`);
        toast.error("Successfully created agent!");
      }
    } catch (error) {
      // Track unexpected errors with detailed error information
      analyticsClient.track("Agent Creation Failed", {
        ...getAnalyticsContext(),
        organizationId,
        userId,
        siteId,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error',
        duration: Date.now() - startTime
      });

      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <button
      onClick={() => startTransition(handleCreateAgent)}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 group",
        isPending
          ? "cursor-not-allowed bg-neutral-900/20 text-neutral-600"
          : "bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 text-white hover:brightness-110 shine shadow-dream"
      )}
      disabled={isPending}
      data-analytics-source="create-agent-button"
    >
      {isPending ? (
        <LoadingDots color="#808080" />
      ) : (
        <>
          <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>New Onboard</span>
        </>
      )}
    </button>
  );
}