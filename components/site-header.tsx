
// components/site-header.tsx
"use client";

import { ExternalLink } from "lucide-react";
import CreateAgentButton from "@/components/create-agent-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Site } from "@/types/site";

interface SiteHeaderProps {
  site: Site;
  url: string;
}

export default function SiteHeader({ site, url }: SiteHeaderProps) {
  return (
    <Breadcrumb className="h-[67.63px] bg-muted/50 rounded-lg border flex items-center justify-between p-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/sites">Sites</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="px-2 py-1 bg-accent rounded-sm">
            {site.name}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
      <div className="flex items-center space-x-4">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{url}</span>
          <ExternalLink className="h-4 w-4" />
        </a>
        <CreateAgentButton siteId={site.id} />
      </div>
    </Breadcrumb>
  );
}