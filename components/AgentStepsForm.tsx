"use client";

import { useState, useEffect } from "react";
import { useAgent } from "@/app/contexts/AgentContext";
import { Step } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

  // Initialize steps when agent changes
  useEffect(() => {
    if (agent) {
      setSteps(agent.settings?.steps ?? []);
    }
  }, [agent]);

  const saveSteps = (newSteps: Step[]) => {
    if (agent) {
      setAgent({
        ...agent,
        settings: {
          ...agent.settings,
          steps: newSteps,
        },
      });
      onStepsUpdated?.();
    }
  };

  const addStep = () => {
    const newSteps = [
      ...steps,
      { title: "", description: "", completionTool: null, completed: false },
    ];
    setSteps(newSteps);
    saveSteps(newSteps);
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
    
    // For input fields, save when focus is lost instead of on every change
    if (field === 'completionTool') {
      saveSteps(newSteps);
    }
  };

  const handleBlur = () => {
    saveSteps(steps);
  };

  const renderToolSelect = (index: number, step: Step) => (
    <select
      value={step.completionTool ?? "none"}
      onChange={(e) => handleStepChange(
        index,
        "completionTool",
        e.target.value === "none" ? null : e.target.value as Step["completionTool"]
      )}
      className="w-full p-2 bg-secondary border rounded-md"
    >
      <option value="none">No Tool</option>
      {tools.map((tool) => (
        <option key={tool} value={tool}>
          {tool.charAt(0).toUpperCase() + tool.slice(1)}
        </option>
      ))}
    </select>
  );

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
                    onBlur={handleBlur}
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
                    onBlur={handleBlur}
                    className="bg-secondary"
                    placeholder="Enter step description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-tool-${index}`}>Completion Tool</Label>
                  {renderToolSelect(index, step)}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}