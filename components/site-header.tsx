// components/site-header.tsx

import { ExternalLink } from "lucide-react";
import CreateAgentButton from "@/components/create-agent-button";
import { Site } from "@/types/site";

interface SiteHeaderProps {
  site: Site;
  url: string;
}

export default function SiteHeader({ site, url }: SiteHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
        {/* Gradient Overlay to Fade Grid */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
      </div>

      {/* Gradient Border Effect */}
      <div className="absolute inset-0 rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

      <div className="relative flex items-center justify-between p-6 z-10">
        <div className="flex items-center space-x-2">
          <a
            href="/sites"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Sites
          </a>
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
          <CreateAgentButton siteId={site.id} />
        </div>
      </div>
    </div>
  );
}
