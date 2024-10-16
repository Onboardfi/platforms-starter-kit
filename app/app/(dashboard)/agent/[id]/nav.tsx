"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";

export default function AgentNav() {
  const { id } = useParams() as { id?: string };
  const segment = useSelectedLayoutSegment();

  const navItems = [
    {
      name: "Editor",
      href: `/agent/${id}`,
      segment: null,
    },
    {
      name: "Tab 1",
      href: `/agent/${id}/tab1`,
      segment: "tab1",
    },
    {
      name: "Tab 2",
      href: `/agent/${id}/tab2`,
      segment: "tab2",
    },
  ];

  return (
    <div className="flex space-x-4 border-b border-stone-200 pb-4 pt-2 dark:border-stone-700">
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "rounded-md px-2 py-1 text-sm font-medium transition-colors active:bg-stone-200 dark:active:bg-stone-600",
            segment === item.segment
              ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          )}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
