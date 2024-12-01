///Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/site-header.tsx

'use client';

import { ExternalLink, AlertTriangle, Sparkles } from "lucide-react";
import CreateAgentButton from "@/components/create-agent-button";
import { Site } from "@/types/site";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import useSWR from 'swr/immutable';
import { STRIPE_CONFIG } from "@/lib/stripe-config";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  site: Site;
  url: string;
}

export default function SiteHeader({ site, url }: SiteHeaderProps) {
  const router = useRouter();
  
  // Fetch agent count using SWR
  const { data: usageData } = useSWR(
    `/api/tierUsage?organizationId=${site.organizationId}`
  );

  const agentCount = usageData?.agentCount ?? 0;
  const maxAgents = STRIPE_CONFIG.TIERS.BASIC.LIMITS.ONBOARDS;
  const isNearLimit = agentCount >= maxAgents - 1;
  const isAtLimit = agentCount >= maxAgents;

  return (
    <div className="flex flex-col space-y-4">
      {/* Warning Banner */}
      {isNearLimit && (
        <Alert 
          className={`
            ${isAtLimit ? 'bg-red-500/20 border-red-500/30' : 'bg-yellow-500/20 border-yellow-500/30'} 
            backdrop-blur-sm shadow-glow transition-all duration-500
          `}
        >
          <AlertTriangle className={`
            h-5 w-5 
            ${isAtLimit ? 'text-red-400' : 'text-yellow-400'}
            animate-pulse
          `} />
          <AlertTitle className="text-white ml-2">
            {isAtLimit ? 'Agent Limit Reached' : 'Approaching Agent Limit'}
          </AlertTitle>
          <AlertDescription className="text-neutral-300 ml-7">
            {isAtLimit 
              ? `You've reached the maximum of ${maxAgents} agents on the Basic plan.` 
              : `You have ${maxAgents - agentCount} agent${maxAgents - agentCount === 1 ? '' : 's'} remaining on the Basic plan.`
            } <Link href="/settings/billing" className="underline hover:text-white transition-colors">Upgrade to Pro</Link> for unlimited agents.
          </AlertDescription>
        </Alert>
      )}

      {/* Existing Header */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        <div className="absolute inset-0 rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

        <div className="relative flex items-center justify-between p-6 z-10">
          <div className="flex items-center space-x-2">
            <Link
              href={`/site/${site.id}/settings`}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Site Settings
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="px-3 py-1 rounded-xl bg-dream-cyan/20 text-white border border-dream-cyan/20 shine">
              {site.name}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 text-sm text-neutral-400 hover:text-white transition-colors group"
            >
              <span>{url}</span>
              <ExternalLink className="h-4 w-4 transition-transform group-hover:scale-110" />
            </a>
            {isAtLimit ? (
              <button
                onClick={() => router.push('/settings/upgrade')}
                className={cn(
                  "group relative inline-flex items-center justify-center gap-2",
                  "px-4 py-2 rounded-lg",
                  "text-black font-medium text-sm",
                  "bg-dream-cyan hover:bg-dream-cyan/90",
                  "transition-all duration-200",
                  "shadow-lg shadow-dream-cyan/20"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro
              </button>
            ) : (
              <CreateAgentButton siteId={site.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}