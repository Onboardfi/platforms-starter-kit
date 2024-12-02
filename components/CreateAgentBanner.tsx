"use client";

import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import useSWR from 'swr';
import CreateAgentButton from "./create-agent-button";

interface CreateAgentBannerProps {
  className?: string;
}

export function CreateAgentBanner({ className }: CreateAgentBannerProps) {
  const { data: session } = useSession();

  // Fetch sites data using SWR
  const { data: sites } = useSWR(
    session?.organizationId ? `/api/sites?organizationId=${session.organizationId}` : null,
    { suspense: false }
  );

  // Get the first available site
  const defaultSite = sites?.[0];

  if (!session?.organizationId || !defaultSite) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/[0.02] bg-neutral-900 overflow-hidden shine shadow-dream",
        "p-6 flex items-center justify-between w-full",
        className
      )}
    >
      {/* Background gradient effect */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-dream-cyan/5 via-dream-cyan/10 to-dream-cyan/5 
+        pointer-events-none"
        style={{ filter: "blur(40px)" }}
      />
      <div className="relative flex items-center gap-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-dream-cyan/10">
          <Bot className="w-6 h-6 text-dream-cyan" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Create Your First Agent</h3>
          <p className="text-sm text-neutral-400 max-w-md">
            Deploy intelligent AI agents that provide real-time assistance and personalized
            guidance throughout the onboarding journey.
          </p>
        </div>
      </div>

      <div className="flex-shrink-0">
        <CreateAgentButton siteId={defaultSite.id} />
      </div>
    </div>
  );
}

export default CreateAgentBanner;
