
// Settings Nav (app/(dashboard)/site/[id]/settings/nav.tsx)
"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { Settings, Globe, Palette } from "lucide-react";

export default function SiteSettingsNav() {
  const { id } = useParams() as { id?: string };
  const segment = useSelectedLayoutSegment();

  const navItems = [
    {
      name: "General",
      href: `/site/${id}/settings`,
      segment: null,
      icon: Settings,
    },
    {
      name: "Domains",
      href: `/site/${id}/settings/domains`,
      segment: "domains",
      icon: Globe,
    },
    {
      name: "Appearance",
      href: `/site/${id}/settings/appearance`,
      segment: "appearance",
      icon: Palette,
    },
  ];

  return (
    <nav className="flex gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = segment === item.segment;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-light transition-all duration-300",
              isActive 
                ? "bg-gradient-to-r from-dream-purple/50 to-dream-cyan/50 text-white shadow-dream shine" 
                : "text-neutral-400 hover:text-white hover:bg-neutral-700/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}