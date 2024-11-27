// app/(dashboard)/settings/nav.tsx
"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Settings, CreditCard, Users } from "lucide-react";

export default function SettingsNav() {
  const segment = useSelectedLayoutSegment();

  const navItems = [
    {
      name: "General",
      href: "/settings",
      segment: null,
      icon: Settings,
    },
    {
      name: "Billing",
      href: "/settings/billing",
      segment: "billing",
      icon: CreditCard,
    },
    {
      name: "Teams",
      href: "/settings/teams",
      segment: "teams",
      icon: Users,
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