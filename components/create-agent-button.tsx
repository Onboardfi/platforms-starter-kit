"use client";

import { useTransition } from "react";
import { createAgent } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import LoadingDots from "@/components/icons/loading-dots";
import va from "@vercel/analytics";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { AgentSettings, SelectSite } from "@/lib/schema";
import { useSession } from "next-auth/react";
import { createId } from "@paralleldrive/cuid2";

interface CreateAgentButtonProps {
  siteId: string;
}

export default function CreateAgentButton({ siteId }: CreateAgentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();

  if (!session?.organizationId || !session?.user?.id) {
    return null;
  }

  // Generate a unique ID for organization
  const organizationId = session.organizationId;
  const userId = session.user.id;
  const orgSlug = `org-${createId()}`;
  
  return (
    <button
      onClick={() =>
        startTransition(async () => {
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
            toast.error(response.error);
          } else if (response.id) {
            va.track("Created Agent");
            router.refresh();
            router.push(`/agent/${response.id}`);
            toast.success("Successfully created agent!");
          }
        })
      }
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 group",
        isPending
          ? "cursor-not-allowed bg-neutral-900/20 text-neutral-600"
          : "bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 text-white hover:brightness-110 shine shadow-dream"
      )}
      disabled={isPending}
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