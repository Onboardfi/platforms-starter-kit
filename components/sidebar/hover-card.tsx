// components/ui/sidebar/hover-card.tsx

import * as React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface SidebarHoverCardProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function SidebarHoverCard({
  trigger,
  content,
  className
}: SidebarHoverCardProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        className={cn(
          "w-64 border-white/[0.02] bg-neutral-900/80 backdrop-blur-md",
          "animate-in zoom-in-50",
          "shadow-dream",
          className
        )}
      >
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}
