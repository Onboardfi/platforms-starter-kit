// components/ui/sidebar/search.tsx

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSearchProps {
  className?: string;
}

export function SidebarSearch({ className }: SidebarSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search 
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors duration-200" 
      />
      <input
        type="text"
        placeholder="Quick search..."
        className={cn(
          "w-full rounded-xl bg-neutral-800/50 px-9 py-2 text-sm",
          "border border-white/[0.02]",
          "placeholder:text-neutral-500",
          "focus:bg-neutral-800/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
          "transition-all duration-200",
          "shine shadow-dream"
        )}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <kbd 
          className="hidden rounded border border-white/[0.02] bg-neutral-800 px-1.5 text-[10px] font-medium text-neutral-500 sm:inline-block"
        >
          ⌘K
        </kbd>
      </div>
    </div>
  );
}