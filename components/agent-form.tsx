"use client";

import { useState, useEffect, useCallback } from "react";
import { useAgent } from "@/app/contexts/AgentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectAgent } from "@/lib/schema";
import { debounce } from "lodash";
import { toast } from "sonner";
import bcrypt from "bcryptjs";

interface AgentFormProps {
  agent: SelectAgent;
}

export default function AgentForm({ agent: initialAgent }: AgentFormProps) {
  const { agent, setAgent } = useAgent();
  const isValidHex = (hex: string) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

  // Form state
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
      }
    }
  });

  // Password management state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce((updatedState) => {
      if (agent) {
        const updatedAgent = {
          ...agent,
          ...updatedState,
          settings: {
            ...agent.settings,
            ...updatedState.settings
          }
        };
        setAgent(updatedAgent);
      }
    }, 1000),
    [agent, setAgent]
  );

  // Update handler
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

  // Handle password update
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

  // Initialize form with agent data
  useEffect(() => {
    if (initialAgent) {
      setFormState({
        name: initialAgent.name ?? "",
        description: initialAgent.description ?? "",
        slug: initialAgent.slug ?? "",
        settings: {
          headingText: initialAgent.settings?.headingText ?? "AI Onboarding Platform",
          tools: initialAgent.settings?.tools ?? [],
          initialMessage: initialAgent.settings?.initialMessage ?? "",
          primaryColor: initialAgent.settings?.primaryColor ?? "#3b82f6",
          secondaryColor: initialAgent.settings?.secondaryColor ?? "#10b981",
          aiModel: initialAgent.settings?.aiModel ?? "openai",
          apiKeys: {
            openai: initialAgent.settings?.apiKeys?.openai ?? ""
          },
          onboardingType: initialAgent.settings?.onboardingType ?? "external",
          allowMultipleSessions: initialAgent.settings?.allowMultipleSessions ?? false,
          authentication: initialAgent.settings?.authentication ?? {
            enabled: false,
            message: "Please enter the password to access this internal onboarding"
          }
        }
      });
    }
  }, [initialAgent]);

  const availableTools = ["memory", "email", "notion"];
  const availableModels = ["openai"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formState.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
              placeholder="Enter agent name..."
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formState.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              placeholder="Describe your agent..."
              className="bg-secondary"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formState.slug}
              onChange={(e) => handleUpdate('slug', e.target.value)}
              placeholder="agent-slug"
              className="bg-secondary"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Onboarding Type</Label>
            <Select 
              value={formState.settings.onboardingType}
              onValueChange={(value) => handleUpdate('settings.onboardingType', value)}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select onboarding type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="external">
                  External (Client Self-Steered)
                </SelectItem>
                <SelectItem value="internal">
                  Internal (Business-Steered)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {formState.settings.onboardingType === "external" 
                ? "Clients will guide themselves through the onboarding process"
                : "You will guide clients through the onboarding process"
              }
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowMultipleSessions"
              checked={formState.settings.allowMultipleSessions}
              onCheckedChange={(checked) => 
                handleUpdate('settings.allowMultipleSessions', checked)
              }
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="allowMultipleSessions">
                Allow Multiple Sessions
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable multiple concurrent onboarding sessions for this agent
              </p>
            </div>
          </div>

          <div className="my-4 border-t" />

          <div className="space-y-2">
            <Label htmlFor="headingText">Heading Text</Label>
            <Input
              id="headingText"
              value={formState.settings.headingText}
              onChange={(e) => handleUpdate('settings.headingText', e.target.value)}
              placeholder="AI Onboarding Platform"
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label>Tools</Label>
            <div className="grid gap-2">
              {availableTools.map((tool) => (
                <div key={tool} className="flex items-center space-x-2">
                  <Checkbox
                    id={tool}
                    checked={formState.settings.tools.includes(tool)}
                    onCheckedChange={(checked) => {
                      const newTools = checked
                        ? [...formState.settings.tools, tool]
                        : formState.settings.tools.filter(t => t !== tool);
                      handleUpdate('settings.tools', newTools);
                    }}
                  />
                  <Label htmlFor={tool} className="capitalize">
                    {tool}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialMessage">Initial Message</Label>
            <Textarea
              id="initialMessage"
              value={formState.settings.initialMessage}
              onChange={(e) => handleUpdate('settings.initialMessage', e.target.value)}
              placeholder="Enter the initial message..."
              className="bg-secondary"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>AI Model & Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select 
              value={formState.settings.aiModel} 
              onValueChange={(value) => handleUpdate('settings.aiModel', value)}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formState.settings.aiModel === "openai" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">OpenAI API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={formState.settings.apiKeys.openai}
                onChange={(e) => handleUpdate('settings.apiKeys.openai', e.target.value)}
                placeholder="Enter your OpenAI API key..."
                className="bg-secondary"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="primaryColor"
                type="color"
                value={formState.settings.primaryColor}
                onChange={(e) => handleUpdate('settings.primaryColor', e.target.value)}
                className="w-16 h-10 p-0 border-0 bg-transparent cursor-pointer"
              />
              <Input
                id="primaryColorHex"
                type="text"
                value={formState.settings.primaryColor}
                onChange={(e) => {
                  if (isValidHex(e.target.value)) {
                    handleUpdate('settings.primaryColor', e.target.value);
                  }
                }}
                placeholder="#3b82f6"
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="secondaryColor"
                type="color"
                value={formState.settings.secondaryColor}
                onChange={(e) => handleUpdate('settings.secondaryColor', e.target.value)}
                className="w-16 h-10 p-0 border-0 bg-transparent cursor-pointer"
              />
              <Input
                id="secondaryColorHex"
                type="text"
                value={formState.settings.secondaryColor}
                onChange={(e) => {
                  if (isValidHex(e.target.value)) {
                    handleUpdate('settings.secondaryColor', e.target.value);
                  }
                }}
                placeholder="#10b981"
                className="bg-secondary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {formState.settings.onboardingType === 'internal' && (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Authentication Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="authEnabled"
                  checked={formState.settings.authentication.enabled}
                  onCheckedChange={(checked) => 
                    handleUpdate('settings.authentication', {
                      ...formState.settings.authentication,
                      enabled: checked
                    })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="authEnabled">
                    Enable Password Protection
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require a password to access this internal onboarding
                  </p>
                </div>
              </div>
            </div>

            {formState.settings.authentication.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="authMessage">Login Message</Label>
                  <Textarea
                    id="authMessage"
                    value={formState.settings.authentication.message}
                    onChange={(e) => 
                      handleUpdate('settings.authentication', {
                        ...formState.settings.authentication,
                        message: e.target.value
                      })
                    }
                    placeholder="Enter a message to display on the login screen..."
                    className="bg-secondary"
                    rows={2}
                  />
                </div>

                {!isChangingPassword ? (
                  <Button
                    onClick={() => setIsChangingPassword(true)}
                    variant="outline"
                    className="w-full"
                  >
                    {formState.settings.authentication.password 
                      ? "Change Password" 
                      : "Set Password"
                    }
                    </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="bg-secondary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="bg-secondary"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handlePasswordUpdate}
                        className="flex-1"
                      >
                        Save Password
                      </Button>
                      <Button
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPassword("");
                          setConfirmPassword("");
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-4 bg-secondary/50 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Password protection adds an extra layer of security for internal onboarding processes. 
                    Share this password only with authorized team members who need access to this onboarding flow.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}