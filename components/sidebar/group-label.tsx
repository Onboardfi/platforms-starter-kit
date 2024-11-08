// components/ui/sidebar/group-label.tsx

import * as React from "react";
import { cn } from "@/lib/utils";

interface SidebarGroupLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarGroupLabel({ children, className }: SidebarGroupLabelProps) {
  return (
    <h3 
      className={cn(
        "px-3 text-xs font-medium text-neutral-500",
        "flex items-center gap-2",
        className
      )}
    >
      {children}
      <div className="h-px flex-1 bg-gradient-to-r from-neutral-800 to-transparent" />
    </h3>
  );
}
