// components/agent-nav.tsx

"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { ExternalLink } from "lucide-react";
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
import { Button } from "@/components/ui/button";

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

  const navItems = [
    { name: "Basic Info", href: `/agent/${id}`, segment: null },
    { name: "Steps", href: `/agent/${id}/steps`, segment: "steps" },
  ];

  return (
    <div className="space-y-4">
      {/* Header with gradient grid background */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          {/* Gradient Overlay to Fade Grid */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        {/* Gradient Border Effect */}
        <div
          className="
            absolute inset-0 rounded-[inherit] [border:1px_solid_transparent]
            ![mask-clip:padding-box,border-box]
            ![mask-composite:intersect]
            [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]
            after:absolute after:aspect-square after:w-[320px] after:animate-border-beam
            after:[animation-delay:0s]
            after:[background:linear-gradient(to_left,#aaa,transparent,transparent)]
            after:[offset-anchor:90%_50%]
            after:[offset-path:rect(0_auto_auto_0_round_200px)]"
        />

        {/* Breadcrumb and actions */}
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
                <BreadcrumbPage
                  className="px-3 py-1 rounded-xl bg-dream-purple/20 text-white border border-dream-purple/20 shine"
                >
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
              <Button
                onClick={handleTogglePublish}
                variant={agent?.published ? "outline" : "default"}
                disabled={isPendingPublishing}
                className="w-24"
              >
                {isPendingPublishing ? (
                  <LoadingDots />
                ) : agent?.published ? (
                  "Unpublish"
                ) : (
                  "Publish"
                )}
              </Button>
            </div>
          </Breadcrumb>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex space-x-2 px-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              segment === item.segment
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
