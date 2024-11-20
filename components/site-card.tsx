//Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/site-card.tsx

"use client";

import BlurImage from "@/components/blur-image";
import type { SelectSite } from "@/lib/schema";
import { placeholderBlurhash, toDateString } from "@/lib/utils";
import { ExternalLink, Settings, Users, Boxes } from "lucide-react";
import Link from "next/link";

// Update the SelectSite type to include agentCount
interface SiteCardProps {
  data: SelectSite & {
    _count?: {
      agents: number;
    };
  };
}

export default function SiteCard({ data }: SiteCardProps) {
  const url = `${data.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  const siteUrl = process.env.NEXT_PUBLIC_VERCEL_ENV ? `https://${url}` : `http://${data.subdomain}.localhost:3000`;

  const renderLogo = () => {
    if (data.logo) {
      return (
        <img 
          src={data.logo} 
          alt={`${data.name || 'Site'} logo`} 
          className="h-full w-full object-cover" 
        />
      );
    }
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-dream-pink to-dream-cyan">
        <span className="text-2xl font-bold text-white">
          {data.name?.charAt(0) || "S"}
        </span>
      </div>
    );
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine min-w-[280px] w-full md:max-w-sm">
      {/* Gradient Border Effect */}
      <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

      <div className="relative">
        <div className="relative h-32">
          {data.image ? (
            <BlurImage
              alt={data.name ?? "Site Banner"}
              blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
              className="object-cover w-full h-full rounded-t-3xl"
              fill
              placeholder="blur"
              src={data.image}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-dream-pink/30 to-dream-cyan/30 rounded-t-3xl" />
          )}

          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-xl bg-neutral-900/50 backdrop-blur-md text-xs text-white border border-white/10 shine">
              {url}
            </span>
          </div>
        </div>

        <div className="absolute -bottom-12 left-6">
          <div className="h-24 w-24 rounded-2xl border-4 border-neutral-800/50 backdrop-blur-md bg-neutral-900/50 shadow-dream overflow-hidden shine">
            {renderLogo()}
          </div>
        </div>
      </div>

      <div className="relative pt-16 p-6">
        <div className="space-y-2 mb-6">
          <h3 className="font-cal text-xl text-white">{data.name}</h3>
          <p className="text-sm text-neutral-400 line-clamp-2">{data.description}</p>
        </div>

        <div className="space-y-2 mb-6">
        

          {/* Agents Count */}
          <div className="p-3 rounded-xl bg-neutral-900/50 backdrop-blur-md shine">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Total </span>
              <span className="text-xs px-2 py-1 rounded-lg bg-dream-blue/20 text-dream-blue border border-dream-blue/20">
                {data._count?.agents || 0} Onboards
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/[0.08]">
          <div>
            <p className="text-neutral-500 text-xs">Created</p>
            <p className="text-sm mt-1 font-mono text-neutral-300">
              {toDateString(data.createdAt)}
            </p>
          </div>
         
        </div>

        <div className="flex gap-3 mt-6">
        <Link
            href={`/site/${data.id}/settings`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900/50 text-neutral-300 text-sm hover:bg-neutral-800/50 transition-all duration-300 shine shadow-dream justify-center group"
            >
            <Settings className="h-4 w-4 transition-transform group-hover:scale-110" />
           
          </Link>


          <Link 
            href={`/site/${data.id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 text-white text-sm hover:brightness-110 transition-all duration-300 shine shadow-dream flex-1 justify-center group"
          >
            <Users className="h-4 w-4 transition-transform group-hover:scale-110" />
            Onboards
          </Link>
          
        
        </div>
      </div>
    </div>
  );
}