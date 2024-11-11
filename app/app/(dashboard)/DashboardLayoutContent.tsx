'use client';

import { ReactNode } from "react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/sidebar/index";
import { cn } from "@/lib/utils";

export function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  // Define the sidebar widths
  const expandedSidebarWidth = 280;
  const collapsedSidebarWidth = 80;

  // Base margin (md:px-8) is 2rem, which equals 32px
  const baseMargin = 32; // in pixels

  // Calculate padding-left based on sidebar state
  const paddingLeft = isCollapsed
    ? collapsedSidebarWidth + baseMargin
    : expandedSidebarWidth + baseMargin;

  return (
    <div className="relative min-h-screen">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-dream-cyan/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-dream-cyan/20 blur-3xl" />
      </div>

      <Sidebar>
        <SidebarContent />
      </Sidebar>
      <main
        className={cn(
          "min-h-screen",
          "transition-all",
          "duration-300",
          "dark:bg-black",
          "px-4",
          "md:px-8",
          "py-4",
          "md:py-6"
        )}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        <div className="max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
