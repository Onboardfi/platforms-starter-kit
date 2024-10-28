"use client";

import { useState, useEffect } from "react";
import { useAgent } from "@/app/contexts/AgentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectAgent } from "@/lib/schema";

interface AgentFormProps {
  agent: SelectAgent;
}

export default function AgentForm({ agent: initialAgent }: AgentFormProps) {
  const { agent, setAgent } = useAgent();
  const isValidHex = (hex: string) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

  // Form state
  const [name, setName] = useState(initialAgent?.name ?? "");
  const [description, setDescription] = useState(initialAgent?.description ?? "");
  const [slug, setSlug] = useState(initialAgent?.slug ?? "");
  const [headingText, setHeadingText] = useState(initialAgent?.settings?.headingText ?? "AI Onboarding Platform");
  const [tools, setTools] = useState<string[]>(initialAgent?.settings?.tools ?? []);
  const [initialMessage, setInitialMessage] = useState(initialAgent?.settings?.initialMessage ?? "");
  const [primaryColor, setPrimaryColor] = useState(initialAgent?.settings?.primaryColor ?? "#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState(initialAgent?.settings?.secondaryColor ?? "#10b981");
  const [aiModel, setAiModel] = useState(initialAgent?.settings?.aiModel ?? "openai");
  const [apiKey, setApiKey] = useState(initialAgent?.settings?.apiKeys?.openai ?? "");

  // Initialize context with initial agent
  useEffect(() => {
    if (initialAgent) {
      setAgent(initialAgent);
    }
  }, [initialAgent, setAgent]);

  // Update agent in context when form values change
  useEffect(() => {
    if (agent) {
      setAgent({
        ...agent,
        name,
        description,
        slug,
        settings: {
          ...agent.settings,
          headingText,
          tools,
          initialMessage,
          primaryColor,
          secondaryColor,
          aiModel,
          apiKeys: {
            ...agent.settings?.apiKeys,
            [aiModel]: apiKey,
          },
        },
      });
    }
  }, [name, description, slug, headingText, tools, initialMessage, primaryColor, secondaryColor, aiModel, apiKey]);

  const availableTools = ["memory", "email", "notion"];
  const availableModels = ["openai"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px]">
      {/* Basic Information Card */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter agent name..."
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your agent..."
              className="bg-secondary"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="agent-slug"
              className="bg-secondary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headingText">Heading Text</Label>
            <Input
              id="headingText"
              value={headingText}
              onChange={(e) => setHeadingText(e.target.value)}
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
                    checked={tools.includes(tool)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setTools([...tools, tool]);
                      } else {
                        setTools(tools.filter((t) => t !== tool));
                      }
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
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Enter the initial message..."
              className="bg-secondary"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Model & Color Scheme Card */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>AI Model & Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select value={aiModel} onValueChange={setAiModel}>
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

          {aiModel === "openai" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">OpenAI API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
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
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-16 h-10 p-0 border-0 bg-transparent cursor-pointer"
              />
              <Input
                id="primaryColorHex"
                type="text"
                value={primaryColor}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidHex(value)) {
                    setPrimaryColor(value);
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
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-16 h-10 p-0 border-0 bg-transparent cursor-pointer"
              />
              <Input
                id="secondaryColorHex"
                type="text"
                value={secondaryColor}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidHex(value)) {
                    setSecondaryColor(value);
                  }
                }}
                placeholder="#10b981"
                className="bg-secondary"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}