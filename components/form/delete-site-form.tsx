"use client";

import LoadingDots from "@/components/icons/loading-dots";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { deleteSite } from "@/lib/actions";
import va from "@vercel/analytics";
import { Trash2 } from "lucide-react";

// Dream UI Label
const DreamLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm text-neutral-400 dark:text-neutral-400">
    {children}
  </div>
);

// Dream UI Input
const DreamInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`
      w-full px-4 py-2.5 
      bg-neutral-900/50 
      text-white 
      border border-white/[0.08] 
      rounded-xl 
      focus:border-red-500/50 
      focus:ring-red-500/20 
      transition-all duration-300 
      placeholder:text-neutral-500
      backdrop-blur-md
      hover:border-white/20
      ${className}
    `}
    {...props}
  />
);

export default function DeleteSiteForm({ siteName }: { siteName: string }) {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    if (!window.confirm("Are you sure you want to delete your site?")) {
      return;
    }

    try {
      const res = await deleteSite(formData, id, "delete");
      if (res.error) {
        toast.error(res.error);
      } else {
        va.track("Deleted Site");
        router.refresh();
        router.push("/sites");
        toast.success(`Successfully deleted site!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete site");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      {/* Gradient Border Effect */}
      <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

      <form action={handleSubmit} className="relative">
        <div className="flex flex-col space-y-6 p-6">
          <div className="pb-4 border-b border-white/[0.08]">
            <h2 className="font-cal text-2xl text-white flex items-center gap-2">
              Delete Site
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <DreamLabel>
                Deletes your site and all posts associated with it. Type in the name
                of your site <b className="text-red-400">{siteName}</b> to confirm.
              </DreamLabel>
            </div>

            <div className="space-y-2">
              <DreamLabel>Confirm site name</DreamLabel>
              <DreamInput
                name="confirm"
                type="text"
                required
                pattern={siteName}
                placeholder={siteName}
              />
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/30 backdrop-blur-md">
              <p className="text-sm text-neutral-400">
                This action is irreversible. Please proceed with caution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-6 border-t border-white/[0.08]">
          <FormButton />
        </div>
      </form>
    </div>
  );
}

function FormButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 group min-w-[140px] justify-center",
        pending
          ? "cursor-not-allowed bg-neutral-900/20 text-neutral-600"
          : "bg-gradient-to-r from-red-500/50 to-red-600/50 text-white hover:brightness-110 shine shadow-dream"
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoadingDots color="#808080" />
      ) : (
        <>
          <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Delete Site</span>
        </>
      )}
    </button>
  );
}