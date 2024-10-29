/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import BlurImage from "@/components/blur-image";
import { placeholderBlurhash, toDateString, cn } from "@/lib/utils";
import { Agent, Site } from "@/types/agent";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Step } from "@/lib/schema";

interface AgentCardProps {
  data: Agent;
}

export default function AgentCard({ data }: AgentCardProps) {
  const steps: Step[] = data.settings?.steps || [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.completed).length;
  const completionPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const clampedValue = Math.min(Math.max(completionPercentage, 0), 100);

  const renderLogo = () => {
    if (data.site?.logo) {
      return (
        <img 
          src={data.site.logo} 
          alt={`${data.site.name || 'Site'} logo`}
          className="h-full w-full object-cover rounded-full" 
        />
      );
    }

    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800 rounded-full">
        <span className="text-2xl font-bold text-white">
          {data.name?.charAt(0) || "A"}
        </span>
      </div>
    );
  };

  return (
    <Card className="group overflow-hidden relative">
      {/* Banner and Avatar Section */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-24">
          {data.image ? (
            <BlurImage
              alt={data.name ?? "Agent Banner"}
              blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
              className="object-cover w-full h-full"
              fill
              placeholder="blur"
              src={data.image}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900" />
          )}
          
          <Badge 
  variant={data.published ? "default" : "secondary"}
  className="absolute top-3 right-3"
>
  {data.published ? "Published" : "Draft"}
</Badge>
        </div>

        {/* Logo Circle - Overlapping Banner */}
        <div className="absolute -bottom-12 left-6">
          <div className="h-24 w-24 rounded-full border-4 border-black bg-black">
            <div className="h-full w-full overflow-hidden">
              {renderLogo()}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="pt-16 pb-6">
        {/* Agent Info */}
        <div className="space-y-1 mb-6">
          <h3 className="font-cal text-xl">{data.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        </div>

        {/* Progress Section */}
        {totalSteps > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedSteps} of {totalSteps} steps complete
              </span>
              <span className="text-muted-foreground">
                {clampedValue.toFixed(0)}%
              </span>
            </div>
            <Progress value={clampedValue} className="h-1" />
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-800">
          <div>
            <p className="text-gray-400 text-xs">Created</p>
            <p className="text-sm mt-1 font-mono">
              {toDateString(data.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Status</p>
            <p className="text-sm mt-1 font-mono">
              {data.published ? "Live" : "Draft"}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2 px-6 pb-6">
        <Button asChild className="w-full">
          <Link href={`/agent/${data.id}`}>Edit Onboard</Link>
        </Button>
        {data.site?.subdomain ? (
          <Button asChild variant="secondary" className="w-full">
            <Link
              href={`http://${data.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${data.slug}`}
            >
              View Live
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            Site Unavailable
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}