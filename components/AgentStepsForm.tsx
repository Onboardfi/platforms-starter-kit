// AgentStepsForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useAgent } from "@/app/contexts/AgentContext";
import { Step } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface AgentStepsFormProps {
  existingSteps?: Step[];
  onStepsUpdated?: () => void;
  tools?: string[];
}

export default function AgentStepsForm({ 
  existingSteps,
  onStepsUpdated,
  tools: providedTools 
}: AgentStepsFormProps) {
  const { agent, setAgent } = useAgent();
  const [steps, setSteps] = useState<Step[]>(existingSteps ?? agent?.settings?.steps ?? []);
  const tools = providedTools ?? agent?.settings?.tools ?? [];

  useEffect(() => {
    if (agent) {
      setSteps(agent.settings?.steps ?? []);
    }
  }, [agent]);

  useEffect(() => {
    if (agent) {
      setAgent({
        ...agent,
        settings: {
          ...agent.settings,
          steps,
        },
      });
      onStepsUpdated?.();
    }
  }, [steps, agent, setAgent, onStepsUpdated]);

  const addStep = () => {
    setSteps([
      ...steps,
      { title: "", description: "", completionTool: null, completed: false },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const handleStepChange = <K extends keyof Step>(
    index: number,
    field: K,
    value: Step[K]
  ) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agent Steps</CardTitle>
          <Button onClick={addStep} variant="outline">Add Step +</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, index) => (
            <Card key={index} className="border border-muted">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Step {index + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(index)}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`step-title-${index}`}>Title</Label>
                  <Input
                    id={`step-title-${index}`}
                    value={step.title}
                    onChange={(e) =>
                      handleStepChange(index, "title", e.target.value)
                    }
                    className="bg-secondary"
                    placeholder="Enter step title..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-description-${index}`}>Description</Label>
                  <Textarea
                    id={`step-description-${index}`}
                    value={step.description}
                    onChange={(e) =>
                      handleStepChange(index, "description", e.target.value)
                    }
                    className="bg-secondary"
                    placeholder="Enter step description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-tool-${index}`}>Completion Tool</Label>
                  <Select
                    value={step.completionTool ?? "none"}
                    onValueChange={(value) =>
                      handleStepChange(
                        index,
                        "completionTool",
                        value === "none" ? null : value as Step["completionTool"]
                      )
                    }
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Select a tool" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tool</SelectItem>
                      {tools.map((tool) => (
                        <SelectItem key={tool} value={tool}>
                          {tool.charAt(0).toUpperCase() + tool.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}