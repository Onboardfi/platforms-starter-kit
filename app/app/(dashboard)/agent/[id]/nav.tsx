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
  const { agent, isPendingSaving, isPendingPublishing, handleTogglePublish } = useAgent();

  const url = agent?.site?.subdomain
    ? `https://${agent.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${agent.slug}`
    : "#";

  const navItems = [
    { name: "Basic Info", href: `/agent/${id}`, segment: null },
    { name: "Steps", href: `/agent/${id}/tab2`, segment: "steps" }

  ];

  return (
    <div className="space-y-4">
      <Breadcrumb className="h-[67.63px] bg-muted/50 rounded-lg border flex items-center justify-between p-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/sites">Sites</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/agents">Agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="px-2 py-1 bg-accent rounded-sm">
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
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <div className="text-sm text-muted-foreground">
            {isPendingSaving ? "Saving..." : "Saved"}
          </div>
          <Button
            onClick={handleTogglePublish}
            variant={agent?.published ? "outline" : "default"}
            disabled={isPendingPublishing}
            className="w-24"
          >
            {isPendingPublishing ? <LoadingDots /> : agent?.published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </Breadcrumb>

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