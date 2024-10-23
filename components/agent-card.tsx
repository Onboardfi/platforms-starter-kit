// components/agent-card.tsx
"use client";

import Link from "next/link";
import BlurImage from "@/components/blur-image";
import { placeholderBlurhash, toDateString } from "@/lib/utils";
import { Agent } from "@/types/agent";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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

  return (
    <Card className="group overflow-hidden">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-cal text-xl">{data.name}</h3>
          <Badge variant={data.published ? "success" : "secondary"}>
            {data.published ? "Published" : "Draft"}
          </Badge>
        </div>
        {totalSteps > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedSteps} of {totalSteps} steps
              </span>
              <span className="text-muted-foreground">
                {clampedValue.toFixed(0)}%
              </span>
            </div>
            <Progress value={clampedValue} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative aspect-video overflow-hidden">
          <BlurImage
            alt={data.name ?? "Agent Image"}
            blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            fill
            placeholder="blur"
            src={data.image ?? "/placeholder.png"}
          />
        </div>
        <div className="p-6 space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {data.description}
          </p>
          <p className="text-xs text-muted-foreground">
            Created {toDateString(data.createdAt)}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2 p-6 pt-0">
        <Button asChild className="w-full">
          <Link href={`/agent/${data.id}`}>Edit Agent</Link>
        </Button>
        {data.site && data.site.subdomain ? (
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