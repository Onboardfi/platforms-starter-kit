// components/dream-form/index.tsx
import React from "react";
import { Loader2 } from "lucide-react";

interface DreamFormProps {
  title: string;
  description?: string;
  helpText?: string;
  children: React.ReactNode;
  onSubmit: (formData: FormData) => Promise<void>;
}

export const DreamLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-light text-neutral-300 mb-2">
    {children}
  </label>
);

export const DreamInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
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
));
DreamInput.displayName = "DreamInput";

export const DreamTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea
    ref={ref}
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
));
DreamTextarea.displayName = "DreamTextarea";

export const DreamSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
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
        cursor-pointer
        pr-10
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 4.5L6 8L9.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  </div>
));
DreamSelect.displayName = "DreamSelect";

export const DreamFileInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <div className="relative">
    <input
      type="file"
      ref={ref}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      {...props}
    />
    <div className={`
      w-full px-4 py-2.5 
      bg-neutral-900/50 
      text-neutral-400
      border border-white/[0.08] 
      rounded-xl 
      transition-all duration-300 
      hover:border-white/20
      flex items-center justify-center
      ${className}
    `}>
      Choose file...
    </div>
  </div>
));
DreamFileInput.displayName = "DreamFileInput";

export const DreamButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "gradient" | "outline";
    loading?: boolean;
  }
>(({ className = "", variant = "default", loading, children, disabled, ...props }, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center
    px-4 py-2.5
    rounded-xl
    font-light
    text-sm
    transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
    shine shadow-dream
  `;

  const variants = {
    default: "bg-neutral-900/50 text-white hover:bg-neutral-800/50",
    gradient: "bg-gradient-to-r from-dream-purple/50 to-dream-cyan/50 text-white hover:brightness-110",
    outline: "border border-white/[0.08] text-white hover:bg-white/[0.08]"
  };

  return (
    <button
      ref={ref}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </button>
  );
});
DreamButton.displayName = "DreamButton";

export const DreamForm = ({
  title,
  description,
  helpText,
  children,
  onSubmit
}: DreamFormProps) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      {/* Gradient Border Effect */}
      <div className="
        absolute inset-[0] 
        rounded-[inherit] 
        [border:1px_solid_transparent] 
        ![mask-clip:padding-box,border-box] 
        ![mask-composite:intersect] 
        [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] 
        after:absolute 
        after:aspect-square 
        after:w-[320px] 
        after:animate-border-beam 
        after:[animation-delay:0s] 
        after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] 
        after:[offset-anchor:90%_50%] 
        after:[offset-path:rect(0_auto_auto_0_round_200px)]
      " />
      
      <div className="relative p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-neutral-400">{description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {children}
            
            {helpText && (
              <p className="text-xs text-neutral-500">{helpText}</p>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <DreamButton
              type="submit"
              variant="gradient"
              loading={isLoading}
            >
              Save Changes
            </DreamButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DreamForm;