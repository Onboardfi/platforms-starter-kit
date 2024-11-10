
// components/form/index.tsx
"use client";

import LoadingDots from "@/components/icons/loading-dots";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import DomainStatus from "./domain-status";
import DomainConfiguration from "./domain-configuration";
import Uploader from "./uploader";
import va from "@vercel/analytics";
import { Save } from "lucide-react";

// Dream UI Components
const DreamLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-light text-neutral-300 mb-2 transition-colors duration-300 group-hover:text-white">
    {children}
  </label>
);

const DreamInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
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

const DreamSelect = ({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
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
      appearance-none
      ${className}
    `}
    {...props}
  />
);

const DreamTextarea = ({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
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

export default function Form({
  title,
  description,
  helpText,
  inputAttrs,
  handleSubmit,
}: {
  title: string;
  description: string;
  helpText: string;
  inputAttrs: {
    name: string;
    type: string;
    defaultValue: string;
    placeholder?: string;
    maxLength?: number;
    pattern?: string;
  };
  handleSubmit: any;
}) {
  const { id } = useParams() as { id?: string };
  const router = useRouter();
  const { update } = useSession();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      {/* Gradient Border Effect */}
      <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

      <form
        action={async (data: FormData) => {
          if (
            inputAttrs.name === "customDomain" &&
            inputAttrs.defaultValue &&
            data.get("customDomain") !== inputAttrs.defaultValue &&
            !confirm("Are you sure you want to change your custom domain?")
          ) {
            return;
          }
          handleSubmit(data, id, inputAttrs.name).then(async (res: any) => {
            if (res.error) {
              toast.error(res.error);
            } else {
              va.track(`Updated ${inputAttrs.name}`, id ? { id } : {});
              if (id) {
                router.refresh();
              } else {
                await update();
                router.refresh();
              }
              toast.success(`Successfully updated ${inputAttrs.name}!`);
            }
          });
        }}
        className="relative"
      >
        <div className="flex flex-col space-y-6 p-6">
          <div className="pb-4 border-b border-white/[0.08]">
            <h2 className="font-cal text-xl text-white">{title}</h2>
            <p className="mt-2 text-sm text-neutral-400">{description}</p>
          </div>

          <div className="space-y-4">
            {inputAttrs.name === "image" || inputAttrs.name === "logo" ? (
              <Uploader
                defaultValue={inputAttrs.defaultValue}
                name={inputAttrs.name}
              />
            ) : inputAttrs.name === "font" ? (
              <DreamSelect name="font" defaultValue={inputAttrs.defaultValue}>
                <option value="font-cal">Cal Sans</option>
                <option value="font-lora">Lora</option>
                <option value="font-work">Work Sans</option>
              </DreamSelect>
            ) : inputAttrs.name === "subdomain" ? (
              <div className="flex w-full max-w-md">
                <DreamInput
                  {...inputAttrs}
                  required
                  className="rounded-r-none"
                />
                <div className="flex items-center px-4 bg-neutral-900/50 border border-l-0 border-white/[0.08] rounded-r-xl text-sm text-neutral-400">
                  {process.env.NEXT_PUBLIC_ROOT_DOMAIN}
                </div>
              </div>
            ) : inputAttrs.name === "customDomain" ? (
              <div className="relative flex w-full max-w-md">
                <DreamInput {...inputAttrs} required />
                {inputAttrs.defaultValue && (
                  <div className="absolute right-3 z-10 flex h-full items-center">
                    <DomainStatus domain={inputAttrs.defaultValue} />
                  </div>
                )}
              </div>
            ) : inputAttrs.name === "description" ? (
              <DreamTextarea {...inputAttrs} rows={3} required />
            ) : (
              <DreamInput {...inputAttrs} required />
            )}

            <div className="p-4 rounded-xl bg-neutral-900/30 backdrop-blur-md">
              <p className="text-sm text-neutral-400">{helpText}</p>
            </div>
          </div>
        </div>

        {inputAttrs.name === "customDomain" && inputAttrs.defaultValue && (
          <DomainConfiguration domain={inputAttrs.defaultValue} />
        )}

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
          : "bg-gradient-to-r from-dream-pink/50 to-dream-cyan/50 text-white hover:brightness-110 shine shadow-dream"
      )}
      disabled={pending}
    >
      {pending ? (
        <LoadingDots color="#808080" />
      ) : (
        <>
          <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Save Changes</span>
        </>
      )}
    </button>
  );
}