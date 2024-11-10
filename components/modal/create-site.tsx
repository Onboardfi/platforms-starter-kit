"use client";

import { toast } from "sonner";
import { createSite } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import LoadingDots from "@/components/icons/loading-dots";
import { useModal } from "./provider";
import va from "@vercel/analytics";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

// Dream UI Component Types
interface DreamLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
}

interface DreamInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

interface DreamTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

// Dream UI Styled Label
const DreamLabel = ({ children, htmlFor }: DreamLabelProps) => (
  <label
    htmlFor={htmlFor}
    className="block text-sm font-light text-neutral-300 mb-2 transition-colors duration-300 group-hover:text-white"
  >
    {children}
  </label>
);

// Dream UI Styled Input
const DreamInput = ({ className = "", ...props }: DreamInputProps) => (
  <input
    className={`
      w-full px-4 py-2.5 
      bg-neutral-900/50 
      text-white 
      border border-white/[0.08] 
      rounded-xl 
      focus:border-dream-purple/50 
      focus:ring-dream-purple/20 
      transition-all duration-300 
      placeholder:text-neutral-500
      backdrop-blur-md
      hover:border-white/20
      ${className}
    `}
    {...props}
  />
);

// Dream UI Styled Textarea
const DreamTextarea = ({ className = "", ...props }: DreamTextareaProps) => (
  <textarea
    className={`
      w-full px-4 py-2.5 
      bg-neutral-900/50 
      text-white 
      border border-white/[0.08] 
      rounded-xl 
      focus:border-dream-purple/50 
      focus:ring-dream-purple/20 
      transition-all duration-300 
      placeholder:text-neutral-500
      backdrop-blur-md
      hover:border-white/20
      resize-none
      ${className}
    `}
    {...props}
  />
);

export default function CreateSiteModal() {
  const router = useRouter();
  const modal = useModal();

  const [data, setData] = useState({
    name: "",
    subdomain: "",
    description: "",
  });

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      subdomain: prev.name.toLowerCase().trim().replace(/[\W_]+/g, "-"),
    }));
  }, [data.name]);

  return (
    <form
      action={async (formData: FormData) => {
        const response = await createSite(formData);
        if (response.error) {
          toast.error(response.error);
        } else if (response.id) {
          va.track("Created Site");
          router.refresh();
          router.push(`/site/${response.id}`);
          modal?.hide();
          toast.success(`Successfully created site!`);
        }
      }}
      className="w-full rounded-3xl bg-neutral-800/50 backdrop-blur-md md:max-w-md shine shadow-dream"
    >
      {/* Gradient Border Effect */}
      <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

      <div className="relative flex flex-col space-y-6 p-6">
        <h2 className="font-cal text-2xl text-white pb-4 border-b border-white/[0.08]">
          Create a new site
        </h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <DreamLabel htmlFor="name">Site Name</DreamLabel>
            <DreamInput
              id="name"
              name="name"
              type="text"
              placeholder="My Awesome Site"
              autoFocus
              value={data.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setData({ ...data, name: e.target.value })
              }
              maxLength={32}
              required
            />
          </div>

          <div className="space-y-2">
            <DreamLabel htmlFor="subdomain">Subdomain</DreamLabel>
            <div className="flex w-full">
              <DreamInput
                id="subdomain"
                name="subdomain"
                type="text"
                placeholder="subdomain"
                value={data.subdomain}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setData({ ...data, subdomain: e.target.value })
                }
                autoCapitalize="off"
                pattern="[a-zA-Z0-9\-]+"
                maxLength={32}
                required
                className="rounded-r-none"
              />
              <div className="flex items-center px-4 bg-neutral-900/50 border border-l-0 border-white/[0.08] rounded-r-xl text-sm text-neutral-400">
                .{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <DreamLabel htmlFor="description">Description</DreamLabel>
            <DreamTextarea
              id="description"
              name="description"
              placeholder="Description about why my site is so awesome"
              value={data.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                setData({ ...data, description: e.target.value })
              }
              maxLength={140}
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end p-6 border-t border-white/[0.08]">
        <CreateSiteFormButton />
      </div>
    </form>
  );
}

function CreateSiteFormButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 group",
        pending
          ? "cursor-not-allowed bg-neutral-900/20 text-neutral-600"
          : "bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 text-white hover:brightness-110 shine shadow-dream"
      )}
      disabled={pending}
    >
      {pending ? (
        <LoadingDots color="#808080" />
      ) : (
        <>
          <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Create Site</span>
        </>
      )}
    </button>
  );
}