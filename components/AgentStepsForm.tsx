//Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/AgentStepsForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useAgent } from "@/app/contexts/AgentContext";
import { Step } from "@/lib/schema";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { createId } from "@paralleldrive/cuid2"; // Ensure unique IDs

interface AgentStepsFormProps {
  existingSteps?: Step[];
  onStepsUpdated?: () => void;
  tools?: string[];
}

// Dream UI Card Header Component
const DreamCardHeader = ({ 
  title, 
  action 
}: { 
  title: string; 
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
    <h3 className="text-xl font-medium text-white">{title}</h3>
    {action}
  </div>
);

// Dream UI Button Component (As defined above)
const DreamButton = ({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  className = ''
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'gradient' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const baseStyles = `
    inline-flex items-center justify-center
    rounded-xl font-light
    transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
    pointer-events-auto    /* Ensure the button is interactive */
    z-10                   /* Position above overlapping elements */
  `;

  const variants = {
    default: 'bg-neutral-900/50 text-white hover:bg-neutral-800/50',
    gradient: 'bg-gradient-to-r from-dream-purple/50 to-dream-cyan/50 text-white hover:brightness-110',
    outline: 'border border-white/[0.08] text-white hover:bg-white/[0.08]',
    destructive: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Dream UI Input Component
const DreamInput = ({
  value,
  onChange,
  onBlur,
  placeholder,
  id,
  required
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    required={required}
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
    `}
  />
);

// Dream UI Textarea Component
const DreamTextarea = ({
  value,
  onChange,
  onBlur,
  placeholder,
  id,
  rows = 3
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  rows?: number;
}) => (
  <textarea
    id={id}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    rows={rows}
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
    `}
  />
);

// Dream UI Select Component
const DreamSelect = ({
  value,
  onChange,
  options,
  id
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  id?: string;
}) => (
  <div className="relative">
    <select
      id={id}
      value={value}
      onChange={onChange}
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
      `}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
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
);

// Main Component
export default function AgentStepsForm({ 
  existingSteps,
  onStepsUpdated,
  tools: providedTools 
}: AgentStepsFormProps) {
  const { agent, setAgent } = useAgent();
  const [steps, setSteps] = useState<Step[]>(existingSteps ?? agent?.settings?.steps ?? []);
  const tools = providedTools ?? agent?.settings?.tools ?? [];

  console.log("Component Rendered with steps:", steps);

  useEffect(() => {
    if (agent) {
      setSteps(agent.settings?.steps ?? []);
    }
  }, [agent]);

  const addStep = () => {
    console.log("Add Step button clicked");
    const newSteps = [
      ...steps,
      { id: createId(), title: "", description: "", completionTool: null, completed: false },
    ];
    console.log("New Steps:", newSteps);
    setSteps(newSteps);
    saveSteps(newSteps);
  };
  
  const saveSteps = (newSteps: Step[]) => {
    if (agent) {
      console.log("Saving new steps:", newSteps);
      setAgent({
        ...agent,
        settings: {
          ...agent.settings,
          steps: newSteps,
        },
      });
      onStepsUpdated?.();
    } else {
      console.log("Agent is not available");
    }
  };
  
  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
    saveSteps(newSteps);
  };

  const handleStepChange = <K extends keyof Step>(
    index: number,
    field: K,
    value: Step[K]
  ) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
    
    if (field === 'completionTool') {
      saveSteps(newSteps);
    }
  };

  const handleBlur = () => {
    saveSteps(steps);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine z-10">
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
          pointer-events-none    /* Prevent blocking of pointer events */
          z-0                    /* Position below main content */
        " />

        <DreamCardHeader
          title="Agent Steps"
          action={
            <DreamButton 
              onClick={addStep} 
              variant="default" 
              className="text-neutral-300"  /* Override text color */
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </DreamButton>
          }
        />

        <div className="p-6 space-y-6">
          {steps.map((step, index) => (
            <div 
              key={step.id}   /* Use unique id instead of index */
              className="relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-md shine"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-5 w-5 text-neutral-500" />
                    <h4 className="text-lg font-medium text-white">
                      Step {index + 1}
                    </h4>
                  </div>
                  <DreamButton
                    variant="destructive"
                    size="sm"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </DreamButton>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Title</label>
                    <DreamInput
                      id={`step-title-${index}`}
                      value={step.title}
                      onChange={(e) => handleStepChange(index, "title", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Enter step title..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Description</label>
                    <DreamTextarea
                      id={`step-description-${index}`}
                      value={step.description}
                      onChange={(e) => handleStepChange(index, "description", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Enter step description..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">
                      Completion Tool
                    </label>
                    <DreamSelect
                      id={`step-tool-${index}`}
                      value={step.completionTool ?? "none"}
                      onChange={(e) => handleStepChange(
                        index,
                        "completionTool",
                        e.target.value === "none" ? null : e.target.value as Step["completionTool"]
                      )}
                      options={[
                        { value: "none", label: "No Tool" },
                        ...tools.map(tool => ({
                          value: tool,
                          label: tool.charAt(0).toUpperCase() + tool.slice(1)
                        }))
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
