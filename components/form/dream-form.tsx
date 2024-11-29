"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { SelectSite } from "@/lib/schema";
import LoadingDots from "@/components/icons/loading-dots";

// Dream UI Form Component with type-safe form handling
export function DreamForm({
  title,
  description,
  helpText,
  formAction,
  children,
}: {
  title: string;
  description: string;
  helpText?: string;
  formAction: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      {/* Gradient Border Effect */}
      <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />
      
      <div className="relative p-6">
        <div className="mb-6">
          <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
          <p className="text-sm text-neutral-400">{description}</p>
        </div>

        <form action={formAction} className="space-y-6">
          {children}
          
          {helpText && (
            <p className="text-xs text-neutral-500">{helpText}</p>
          )}

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "px-4 py-2.5 rounded-xl text-sm transition-all duration-300 group relative overflow-hidden",
        pending 
          ? "bg-neutral-800 text-neutral-400 cursor-not-allowed"
          : "bg-gradient-to-r from-dream-purple/50 to-dream-cyan/50 text-white hover:brightness-110 shine shadow-dream"
      )}
    >
      <span className="relative z-10">
        {pending ? <LoadingDots /> : "Save Changes"}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-dream-purple/20 to-dream-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </button>
  );
}

// Dream UI Input Component
export function DreamInput({
  type = "text",
  name,
  defaultValue,
  placeholder,
  maxLength,
}: {
  type?: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="relative group">
      <input
        type={type}
        name={name}
        defaultValue={defaultValue || ""}
        placeholder={placeholder}
        maxLength={maxLength}
        className="
          w-full px-4 py-2.5 
          bg-neutral-900/50 
          text-white 
          border border-white/[0.08] 
          rounded-xl 
          transition-all duration-300 
          placeholder:text-neutral-500
          backdrop-blur-md
          hover:border-white/20
          focus:border-dream-purple/50 
          focus:ring-dream-purple/20
          focus:translate-y-[-1px]
          relative z-10
        "
      />
      <div className="
        absolute inset-0 
        rounded-xl 
        bg-gradient-to-r from-dream-purple/20 to-dream-cyan/20 
        opacity-0 group-hover:opacity-100 
        transition-opacity duration-300 
        -z-10
      " />
    </div>
  );
}