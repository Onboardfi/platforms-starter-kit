// Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/agent-form.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAgent } from "@/app/contexts/AgentContext";
import { SelectAgent } from "@/lib/schema";
import { debounce } from "lodash";
import { toast } from "sonner";
import bcrypt from "bcryptjs";
import { DailyBotSettings } from './DailyBotSettings';

const DreamLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label
    htmlFor={htmlFor}
    className="block text-sm font-light text-neutral-300 mb-2 transition-colors duration-300 group-hover:text-white"
  >
    {children}
  </label>
);

const DreamInput = React.forwardRef<
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

const DreamTextarea = React.forwardRef<
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

interface DreamSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

const DreamSelect = React.forwardRef<HTMLSelectElement, DreamSelectProps>(
  ({ options, className = "", ...props }, ref) => (
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
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-transform duration-300">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  )
);
DreamSelect.displayName = "DreamSelect";

interface DreamCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id?: string;
}

const DreamCheckbox = ({ checked, onChange, label, description, id }: DreamCheckboxProps) => (
  <label htmlFor={id} className="flex items-start space-x-3 cursor-pointer group">
    <div className="relative flex items-center justify-center w-6 h-6">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer"
      />
      <div className={`
        w-5 h-5 
        rounded-md 
        border 
        transition-all duration-300
        ${checked 
          ? 'bg-gradient-to-r from-dream-purple to-dream-cyan border-dream-cyan/50' 
          : 'border-white/20 group-hover:border-white/40'
        }
      `}>
        {checked && (
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            />
          </svg>
        )}
      </div>
    </div>
    <div className="flex-1">
      <div className="text-sm text-white group-hover:text-white/90 transition-colors duration-300">
        {label}
      </div>
      {description && (
        <div className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors duration-300 mt-0.5">
          {description}
        </div>
      )}
    </div>
  </label>
);

interface DreamCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const DreamCard = ({ title, children, className = "" }: DreamCardProps) => (
  <div className={`
    relative overflow-hidden 
    rounded-3xl 
    bg-neutral-800/50 
    backdrop-blur-md 
    shadow-dream 
    shine
    ${className}
  `}>
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
      <h3 className="text-xl font-medium text-white mb-6 pb-4 border-b border-white/[0.08]">
        {title}
      </h3>
      {children}
    </div>
  </div>
);

interface DreamButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gradient' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const DreamButton = React.forwardRef<HTMLButtonElement, DreamButtonProps>(
  ({ children, variant = 'default', size = 'md', className = "", ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      rounded-xl
      font-light
      transition-all duration-300
      disabled:opacity-50 disabled:cursor-not-allowed
      shine shadow-dream
    `;

    const variants = {
      default: 'bg-neutral-900/50 text-white hover:bg-neutral-800/50',
      gradient: 'bg-gradient-to-r from-dream-purple/50 to-dream-cyan/50 text-white hover:brightness-110',
      outline: 'border border-white/[0.08] text-white hover:bg-white/[0.08]'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DreamButton.displayName = "DreamButton";

interface DreamColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const DreamColorPicker = ({ value, onChange, label }: DreamColorPickerProps) => (
  <div className="space-y-2">
    <DreamLabel>{label}</DreamLabel>
    <div className="flex items-center space-x-4">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 h-10 p-0 border-0 bg-transparent cursor-pointer rounded-lg overflow-hidden"
      />
      <DreamInput
        type="text"
        value={value}
        onChange={(e) => {
          if (/^#([0-9A-F]{3}){1,2}$/i.test(e.target.value)) {
            onChange(e.target.value);
          }
        }}
        placeholder="#000000"
        className="flex-1"
      />
    </div>
  </div>
);

interface AgentFormProps {
  agent: SelectAgent;
}

export default function AgentForm({ agent: initialAgent }: AgentFormProps) {
  const { agent, setAgent } = useAgent();
  
  // Add "monday" to the list of available tools
  const availableTools = ["memory", "email", "notion", "monday"];
  const availableModels = ["openai"];

  const [formState, setFormState] = useState({
    name: initialAgent?.name ?? "",
    description: initialAgent?.description ?? "",
    slug: initialAgent?.slug ?? "",
    settings: {
      headingText: initialAgent?.settings?.headingText ?? "AI Onboarding Platform",
      tools: initialAgent?.settings?.tools ?? [],
      initialMessage: initialAgent?.settings?.initialMessage ?? "",
      primaryColor: initialAgent?.settings?.primaryColor ?? "#3b82f6",
      secondaryColor: initialAgent?.settings?.secondaryColor ?? "#10b981",
      aiModel: initialAgent?.settings?.aiModel ?? "openai",
      apiKeys: {
        openai: initialAgent?.settings?.apiKeys?.openai ?? ""
      },
      onboardingType: initialAgent?.settings?.onboardingType ?? "external",
      allowMultipleSessions: initialAgent?.settings?.allowMultipleSessions ?? false,
      authentication: initialAgent?.settings?.authentication ?? {
        enabled: false,
        message: "Please enter the password to access this internal onboarding"
      },  // Fixed missing comma
      useDailyBot: initialAgent?.settings?.useDailyBot ?? false,
      dailyBot: initialAgent?.settings?.dailyBot ?? {
        botProfile: "voice_2024_10",
        maxDuration: 600,
        services: {
          llm: "together",
          tts: "cartesia", 
          stt: "deepgram"
        },
        voice: {
          model: "sonic-english",
          voice: "79a125e8-cd45-4c13-8a67-188112f4dd22",
          language: "en"
        }
      }
    }
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const debouncedUpdate = useCallback(
    debounce((updatedState) => {
      if (agent) {
        setAgent({
          ...agent,
          ...updatedState,
          settings: {
            ...agent.settings,
            ...updatedState.settings
          }
        });
      }
    }, 1000),
    [agent, setAgent]
  );

  const handleUpdate = useCallback((field: string, value: any) => {
    setFormState(prev => {
      const newState = field.startsWith('settings.')
        ? {
            ...prev,
            settings: {
              ...prev.settings,
              [field.split('.')[1]]: value
            }
          }
        : field === 'settings'
        ? {
            ...prev,
            settings: value
          }
        : {
            ...prev,
            [field]: value
          };
      
      debouncedUpdate(newState);
      return newState;
    });
  }, [debouncedUpdate]);

  const handlePasswordUpdate = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newSettings = {
        ...formState.settings,
        authentication: {
          ...formState.settings.authentication,
          enabled: true,
          password: hashedPassword
        }
      };

      handleUpdate('settings', newSettings);
      setPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      toast.success("Password updated successfully");
    } catch (error) {
      toast.error("Failed to update password");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto p-6">
      <DreamCard title="Basic Information">
        <div className="space-y-6">
          <div className="space-y-2">
            <DreamLabel htmlFor="name">Name</DreamLabel>
            <DreamInput
              id="name"
              value={formState.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
              placeholder="Enter agent name..."
            />
          </div>

          <div className="space-y-2">
            <DreamLabel htmlFor="description">Description</DreamLabel>
            <DreamTextarea
              id="description"
              value={formState.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              placeholder="Describe your agent..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <DreamLabel htmlFor="slug">Slug</DreamLabel>
            <DreamInput
              id="slug"
              value={formState.slug}
              onChange={(e) => handleUpdate('slug', e.target.value)}
              placeholder="agent-slug"
            />
          </div>
        </div>
      </DreamCard>

      <DreamCard title="Settings">
        <div className="space-y-6">
          <div className="space-y-2">
            <DreamLabel>Onboarding Type</DreamLabel>
            <DreamSelect
              value={formState.settings.onboardingType}
              onChange={(e) => handleUpdate('settings.onboardingType', e.target.value)}
              options={[
                { value: "external", label: "External (Client Self-Steered)" },
                { value: "internal", label: "Internal (Business-Steered)" }
              ]}
            />
            <p className="text-sm text-neutral-400 mt-2">
              {formState.settings.onboardingType === "external" 
                ? "Clients will guide themselves through the onboarding process"
                : "You will guide clients through the onboarding process"
              }
            </p>
          </div>

          <DreamCheckbox
            checked={formState.settings.allowMultipleSessions}
            onChange={(checked) => handleUpdate('settings.allowMultipleSessions', checked)}
            label="Allow Multiple Sessions"
            description="Enable multiple concurrent onboarding sessions for this agent"
          />

          <div className="my-6 border-t border-white/[0.08]" />

          <div className="space-y-2">
            <DreamLabel htmlFor="headingText">Heading Text</DreamLabel>
            <DreamInput
              id="headingText"
              value={formState.settings.headingText}
              onChange={(e) => handleUpdate('settings.headingText', e.target.value)}
              placeholder="AI Onboarding Platform"
            />
          </div>

          <div className="space-y-2">
            <DreamLabel>Available Tools</DreamLabel>
            <div className="space-y-3 p-4 bg-neutral-900/30 rounded-xl backdrop-blur-md">
              {availableTools.map((tool) => (
                <DreamCheckbox
                  key={tool}
                  id={tool}
                  checked={formState.settings.tools.includes(tool)}
                  onChange={(checked) => {
                    const newTools = checked
                      ? [...formState.settings.tools, tool]
                      : formState.settings.tools.filter(t => t !== tool);
                    handleUpdate('settings.tools', newTools);
                  }}
                  label={tool.charAt(0).toUpperCase() + tool.slice(1)}
                  description={`Enable ${tool} integration for this agent`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <DreamLabel htmlFor="initialMessage">Initial Message</DreamLabel>
            <DreamTextarea
              id="initialMessage"
              value={formState.settings.initialMessage}
              onChange={(e) => handleUpdate('settings.initialMessage', e.target.value)}
              placeholder="Enter the initial message..."
              rows={4}
            />
          </div>
        </div>
      </DreamCard>

      <DreamCard title="AI Model & Branding">
        <div className="space-y-6">
          <div className="space-y-2">
            <DreamLabel>AI Model</DreamLabel>
            <DreamSelect
              value={formState.settings.aiModel}
              onChange={(e) => handleUpdate('settings.aiModel', e.target.value)}
              options={availableModels.map(model => ({
                value: model,
                label: model.toUpperCase()
              }))}
            />
          </div>

          {formState.settings.aiModel === "openai" && (
            <div className="space-y-2">
              <DreamLabel htmlFor="apiKey">OpenAI API Key</DreamLabel>
              <DreamInput
                id="apiKey"
                type="password"
                value={formState.settings.apiKeys.openai}
                onChange={(e) => handleUpdate('settings.apiKeys.openai', e.target.value)}
                placeholder="Enter your OpenAI API key..."
              />
            </div>
          )}

          <DreamColorPicker
            label="Primary Color"
            value={formState.settings.primaryColor}
            onChange={(value) => handleUpdate('settings.primaryColor', value)}
          />

          <DreamColorPicker
            label="Secondary Color"
            value={formState.settings.secondaryColor}
            onChange={(value) => handleUpdate('settings.secondaryColor', value)}
          />
        </div>
      </DreamCard>

      // Add before the Authentication Settings card in the JSX
<DreamCard title="Voice Interactions">
  <DailyBotSettings
    enabled={formState.settings.useDailyBot}
    config={formState.settings.dailyBot}
    onToggle={(enabled) => handleUpdate('settings.useDailyBot', enabled)}
    onUpdate={(key, value) => {
      handleUpdate('settings.dailyBot', {
        ...formState.settings.dailyBot,
        [key]: value
      });
    }}
  />
</DreamCard>
      {formState.settings.onboardingType === 'internal' && (
        <DreamCard title="Authentication Settings" className="lg:col-span-3">
          <div className="space-y-6">
            <DreamCheckbox
              checked={formState.settings.authentication.enabled}
              onChange={(checked) => 
                handleUpdate('settings.authentication', {
                  ...formState.settings.authentication,
                  enabled: checked
                })
              }
              label="Enable Password Protection"
              description="Require a password to access this internal onboarding"
            />

            {formState.settings.authentication.enabled && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <DreamLabel htmlFor="authMessage">Login Message</DreamLabel>
                  <DreamTextarea
                    id="authMessage"
                    value={formState.settings.authentication.message}
                    onChange={(e) => 
                      handleUpdate('settings.authentication', {
                        ...formState.settings.authentication,
                        message: e.target.value
                      })
                    }
                    placeholder="Enter a message to display on the login screen..."
                    rows={2}
                  />
                </div>

                {!isChangingPassword ? (
                  <DreamButton
                    onClick={() => setIsChangingPassword(true)}
                    variant="outline"
                    className="w-full"
                  >
                    {formState.settings.authentication.password 
                      ? "Change Password" 
                      : "Set Password"
                    }
                  </DreamButton>
                ) : (
                  <div className="space-y-6 p-4 bg-neutral-900/30 rounded-xl backdrop-blur-md">
                    <div className="space-y-2">
                      <DreamLabel htmlFor="password">Password</DreamLabel>
                      <DreamInput
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                    </div>

                    <div className="space-y-2">
                      <DreamLabel htmlFor="confirmPassword">Confirm Password</DreamLabel>
                      <DreamInput
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                      />
                    </div>

                    <div className="flex gap-3">
                      <DreamButton
                        onClick={handlePasswordUpdate}
                        variant="gradient"
                        className="flex-1"
                      >
                        Save Password
                      </DreamButton>
                      <DreamButton
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPassword("");
                          setConfirmPassword("");
                        }}
                        variant="outline"
                      >
                        Cancel
                      </DreamButton>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-neutral-900/30 rounded-xl backdrop-blur-md">
                  <p className="text-sm text-neutral-400">
                    Password protection adds an extra layer of security for internal onboarding processes. 
                    Share this password only with authorized team members who need access to this onboarding flow.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DreamCard>
      )}
    </div>
  );
}
// Add at the bottom of agent-form.tsx

export {
  DreamLabel,
  DreamInput,
  DreamTextarea,
  DreamSelect,
  DreamCheckbox,
  DreamCard,
  DreamButton,
  DreamColorPicker
};