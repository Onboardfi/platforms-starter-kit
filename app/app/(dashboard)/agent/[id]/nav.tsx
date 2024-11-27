///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/app/(dashboard)/agent/[id]/nav.tsx

"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { ExternalLink, Globe } from "lucide-react";
import LoadingDots from "@/components/icons/loading-dots";
import { useAgent } from "@/app/contexts/AgentContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";


export default function AgentNav() {
  const { id } = useParams() as { id?: string };
  const segment = useSelectedLayoutSegment();
  const {
    agent,
    isPendingSaving,
    isPendingPublishing,
    handleTogglePublish,
  } = useAgent();

  const url = agent?.site?.subdomain
  ? `https://${agent.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${agent.slug}`
  : "#";

  // Determine if we should show the tab switcher
  const shouldShowTabs = !segment || segment === "tab2"; // Only show on main page and steps page

  const navItems = [
    { name: "Basic Info", href: `/agent/${id}`, segment: null },
    { name: "Steps", href: `/agent/${id}/tab2`, segment: "steps" },
  ];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        <div className="absolute inset-0 rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

        <div className="relative z-10">
          <Breadcrumb className="h-[67.63px] bg-transparent rounded-lg border flex items-center justify-between p-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/sites"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Sites
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/agents"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Agents
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="px-3 py-1 rounded-xl bg-dream-cyan/20 text-white border border-dream-cyan/20 shine">
                  {agent?.name || "Agent"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
            <div className="flex items-center space-x-3">
              {agent?.published && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <div className="text-sm text-neutral-400">
                {isPendingSaving ? "Saving..." : "Saved"}
              </div>
              <button
                onClick={handleTogglePublish}
                disabled={isPendingPublishing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-300 group",
                  isPendingPublishing
                    ? "cursor-not-allowed bg-neutral-900/20 text-neutral-600"
                    : agent?.published
                    ? "bg-neutral-900/50 text-neutral-300 hover:bg-neutral-800/50 shine shadow-dream"
                    : "bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 text-white hover:brightness-110 shine shadow-dream"
                )}
              >
                {isPendingPublishing ? (
                  <LoadingDots />
                ) : (
                  <>
                    <Globe className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>{agent?.published ? "Unpublish" : "Publish"}</span>
                  </>
                )}
              </button>
            </div>
          </Breadcrumb>
        </div>
      </div>

      {/* Only render the nav tabs if we should show them */}
      {shouldShowTabs && (
        <nav className="flex space-x-2 px-2">
          <Link
            href={`/agent/${id}`}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              !segment
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Basic Info
          </Link>
          <Link
            href={`/agent/${id}/tab2`}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              segment === "tab2"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Steps
          </Link>
        </nav>
      )}
    </div>
  );
}