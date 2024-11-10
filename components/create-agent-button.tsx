"use client";

import { useTransition } from "react";
import { createAgent } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import LoadingDots from "@/components/icons/loading-dots";
import va from "@vercel/analytics";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface CreateAgentButtonProps {
  siteId: string;
}

export default function CreateAgentButton({ siteId }: CreateAgentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const response = await createAgent(null, siteId, null);
          if (response.error) {
            toast.error(response.error);
          } else if (response.id) {
            va.track("Created Agent");
            router.refresh();
            router.push(`/agent/${response.id}`);
            toast.success("Successfully created agent!");
          }
        })
      }
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 group",
        isPending
          ? "cursor-not-allowed bg-neutral-900/20 text-neutral-600"
          : "bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 text-white hover:brightness-110 shine shadow-dream"
      )}
      disabled={isPending}
    >
      {isPending ? (
        <LoadingDots color="#808080" />
      ) : (
        <>
          <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>New Onboard</span>
        </>
      )}
    </button>
  );
}