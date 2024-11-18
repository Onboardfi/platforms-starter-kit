/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import BlurImage from "@/components/blur-image";
import { placeholderBlurhash, toDateString, cn } from "@/lib/utils";
import { Agent, Site } from "@/types/agent";
import { Progress } from "@/components/ui/progress";
import { Step } from "@/lib/schema";
import { MessageCircle, Share2, User, Settings } from "lucide-react";

interface AgentCardProps {
  data: Agent;
}

export default function AgentCard({ data }: AgentCardProps) {
  const steps: Step[] = data.settings?.steps || [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.completed).length;
  const completionPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const clampedValue = Math.min(Math.max(completionPercentage, 0), 100);
  const sessionCount = data._count?.sessions || 0;

  const renderLogo = () => {
    if (data.site?.logo) {
      return (
        <img 
          src={data.site.logo} 
          alt={`${data.site.name || 'Site'} logo`}
          className="h-full w-full object-cover" 
        />
      );
    }

    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-dream-pink to-dream-cyan">
        <span className="text-2xl font-bold text-white">
          {data.name?.charAt(0) || "A"}
        </span>
      </div>
    );
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      {/* Gradient Border Effect */}
      <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

      <div className="relative">
        <div className="relative h-32">
          {data.image ? (
            <BlurImage
              alt={data.name ?? "Agent Banner"}
              blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
              className="object-cover w-full h-full rounded-t-3xl"
              fill
              placeholder="blur"
              src={data.image}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-dream-pink/30 to-dream-blue/30 to-dream-cyan/30 rounded-t-3xl" />
          )}

          <div className="absolute top-4 right-4 flex gap-2">
            <span className={cn(
              "px-3 py-1 rounded-xl backdrop-blur-md text-xs text-white border border-white/10 shine",
              data.published 
                ? "bg-dream-cyan/20 border-dream-cyan/20" 
                : "bg-neutral-900/50"
            )}>
              {data.published ? "Published" : "Draft"}
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
          
          {/* Agent Configuration Badges */}
          <div className="flex flex-wrap gap-2">
            {/* Agent Type Badge */}
            <span className={cn(
              "px-3 py-1 rounded-xl backdrop-blur-md text-xs border border-white/10 shine flex items-center gap-1",
              data.settings.onboardingType === "external"
                ? "bg-dream-pink/20 border-dream-pink/20 text-dream-pink"
                : "bg-dream-cyan/20 border-dream-cyan/20 text-dream-cyan"
            )}>
              <Share2 className="h-3 w-3" />
              {data.settings.onboardingType === "external" ? "External" : "Internal"}
            </span>

            {/* Session Type Badge */}
            <span className={cn(
              "px-3 py-1 rounded-xl backdrop-blur-md text-xs border border-white/10 shine flex items-center gap-1",
              data.settings.allowMultipleSessions
                ? "bg-dream-pink/20 border-dream-pink/20 text-dream-pink"
                : "bg-dream-cyan/20 border-dream-cyan/20 text-dream-cyan"
            )}>
              <User className="h-3 w-3" />
              {data.settings.allowMultipleSessions ? "One-to-Many" : "One-to-One"}
            </span>
          </div>

          <p className="text-sm text-neutral-400 line-clamp-2">
            {data.description}
          </p>
        </div>

        {totalSteps > 0 && (
          <div className="space-y-2 mb-6 p-3 rounded-xl bg-neutral-900/50 backdrop-blur-md shine">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">
                {completedSteps} of {totalSteps} steps complete
              </span>
              <span className="text-dream-cyan">
                {clampedValue.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-dream-pink to-dream-cyan rounded-full transition-all duration-500"
                style={{ width: `${clampedValue}%` }}
              />
            </div>
          </div>
        )}

        {/* Session Count Display */}
        <div className="space-y-2 mb-6 p-3 rounded-xl bg-neutral-900/50 backdrop-blur-md shine">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Total Sessions</span>
            <span className="text-xs px-2 py-1 rounded-lg bg-dream-pink/20 text-dream-pink border border-dream-pink/20 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {sessionCount} Sessions
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {/* Settings Button - Remains Black */}
          <Link
            href={`/agent/${data.id}/settings`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900/50 text-neutral-300 text-sm hover:bg-neutral-800/50 transition-all duration-300 shine shadow-dream justify-center group"
          >
            <Settings className="h-4 w-4 transition-transform group-hover:scale-110" />
          </Link>

          {/* Edit Onboard Button - Changed to Dream Blue */}
          <Link 
            href={`/agent/${data.id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-dream-blue/50 to-dream-blue/70 text-white text-sm hover:brightness-110 transition-all duration-300 shine shadow-dream flex-1 justify-center group"
          >
            Edit Onboard
          </Link>
          
          {/* View Live Button - Changed to Custom Green */}
          {data.site?.subdomain ? (
            <Link
              href={`http://${data.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${data.slug}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-custom-green/50 to-custom-green-light/50 text-white text-sm hover:brightness-110 transition-all duration-300 shine shadow-dream flex-1 justify-center group"
            >
              View Live
            </Link>
          ) : (
            <button 
              disabled
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900/20 text-neutral-600 text-sm flex-1 justify-center cursor-not-allowed"
            >
              Site Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}