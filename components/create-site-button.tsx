"use client";

import { useModal } from "@/components/modal/provider";
import { Plus } from "lucide-react";
import { ReactNode } from "react";

export default function CreateSiteButton({
  children,
}: {
  children: ReactNode;
}) {
  const modal = useModal();
  return (
    <button
      onClick={() => modal?.show(children)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl 
        bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 
        text-white text-sm 
        hover:brightness-110 
        transition-all duration-300 
        shine shadow-dream 
        group"
    >
      <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
      Create New Site
    </button>
  );
}