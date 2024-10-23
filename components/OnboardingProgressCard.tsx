// components/OnboardingProgressCard.tsx

"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Fixed the quotes
import { Step } from '@/lib/types';

interface OnboardingProgressCardProps {
  emailSent: boolean;
  notesTaken: boolean;
  notionMessageSent: boolean;
  memoryKv: { [key: string]: any };
  steps?: Step[];
  headingText?: string;
  availableTools: string[];
  agentId: string;
  onStepsUpdated: () => void;
  primaryColor: string; // Add primary color prop
  secondaryColor: string; // Add secondary color prop
}

export default function OnboardingProgressCard({
  emailSent,
  notesTaken,
  notionMessageSent,
  memoryKv,
  steps = [],
  headingText,
  availableTools,
  agentId,
  onStepsUpdated,
  primaryColor,
  secondaryColor,
}: OnboardingProgressCardProps) {
  const [clientName, setClientName] = useState('');

  const markStepCompleted = async (stepIndex: number) => {
    const updatedSteps = steps.map((step, index) =>
      index === stepIndex ? { ...step, completed: true } : step
    );

    try {
      const response = await fetch('/api/updateAgentSteps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          steps: updatedSteps,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onStepsUpdated();
      }
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  const getStepCompletion = (step: Step) => {
    if (step.completed) return true;
    if (!step.completionTool || !availableTools.includes(step.completionTool)) return false;
    
    switch (step.completionTool) {
      case 'email': return emailSent;
      case 'notion': return notionMessageSent;
      case 'notesTaken': return notesTaken;
      case 'memory': return true;
      default: return false;
    }
  };

  useEffect(() => {
    const firstName = memoryKv.first_name || '';
    const lastName = memoryKv.last_name || '';
    if (firstName || lastName) {
      setClientName(`${firstName} ${lastName}`.trim());
    }
  }, [memoryKv]);

  if (!steps.length) return null;

  const completedSteps = steps.filter(step => getStepCompletion(step)).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card className="w-full bg-muted/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{headingText || "Onboarding Progress"}</h2>
              <div className="text-sm text-muted-foreground">
                {completedSteps} of {steps.length} steps completed
              </div>
            </div>
            <Progress
              value={progress}
              className="w-[100px] h-2 rounded-full"
              style={{
                backgroundColor: '#e5e7eb', // Light gray background
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  backgroundColor: primaryColor, // Primary color fill
                  transition: 'width 0.3s ease-in-out',
                }}
              ></div>
            </Progress>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => {
              const isCompleted = getStepCompletion(step);
              return (
                <Card
                  key={index}
                  className={cn(
                    "relative overflow-hidden transition-colors",
                    isCompleted 
                      ? "bg-primary/5 dark:bg-primary/10" 
                      : "hover:bg-secondary/50 cursor-pointer"
                  )}
                  onClick={() => !isCompleted && markStepCompleted(index)}
                  style={{
                    borderColor: isCompleted ? primaryColor : secondaryColor,
                  }}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{step.title}</h3>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {step.description}
                    </p>
                    {step.completionTool && (
                      <Badge 
                        variant="secondary" 
                        className="mt-2" 
                        style={{ backgroundColor: secondaryColor, color: '#fff' }}
                      >
                        {step.completionTool}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
