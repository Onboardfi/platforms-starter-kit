// components/OnboardingProgressCard.tsx

"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Step } from '@/lib/types';
import Confetti from './Confetti'; // Import the Confetti component

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
  primaryColor: string;
  secondaryColor: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 }
  }
};

const progressVariants = {
  hidden: { width: "0%" },
  visible: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.5, ease: "easeOut" }
  })
};

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
  const [completedStepsCount, setCompletedStepsCount] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false); // State to control confetti

  const getStepCompletion = useCallback((step: Step): boolean => {
    if (step.completed) return true;
    if (!step.completionTool || !availableTools.includes(step.completionTool)) return false;
    
    switch (step.completionTool) {
      case 'email': return emailSent;
      case 'notion': return notionMessageSent;
      case 'notesTaken': return notesTaken;
      case 'memory': return true;
      default: return false;
    }
  }, [emailSent, notionMessageSent, notesTaken, availableTools]);

  const fireConfetti = useCallback(() => {
    setConfettiActive(true);
    // Reset confetti after the animation duration
    setTimeout(() => {
      setConfettiActive(false);
    }, 4000); // Duration should match the Confetti component's duration
  }, []);

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
        const newCompletedCount = updatedSteps.filter(step => step.completed).length;
        if (newCompletedCount === steps.length) {
          fireConfetti();
        }
      }
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  useEffect(() => {
    const firstName = memoryKv.first_name || '';
    const lastName = memoryKv.last_name || '';
    if (firstName || lastName) {
      setClientName(`${firstName} ${lastName}`.trim());
    }
  }, [memoryKv]);

  useEffect(() => {
    const completedCount = steps.filter(step => getStepCompletion(step)).length;
    if (completedCount > completedStepsCount) {
      setCompletedStepsCount(completedCount);
      if (completedCount === steps.length) {
        fireConfetti();
      }
    }
  }, [steps, completedStepsCount, getStepCompletion, fireConfetti]);

  if (!steps.length) return null;

  const completedSteps = steps.filter(step => getStepCompletion(step)).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative"
    >
      <Card className="w-full bg-muted/50">
        <CardContent className="py-2">
          <div className="space-y-2">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <motion.div 
                variants={stepVariants}
                className="space-y-0"
              >
                <h2 className="text-base font-semibold">
                  {headingText || "Onboarding Progress"}
                </h2>
                <div className="text-xs text-muted-foreground">
                  {completedSteps} of {steps.length} steps completed
                </div>
              </motion.div>

              <Progress className="w-[100px] h-1.5 rounded-full bg-secondary/20">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: primaryColor }}
                  variants={progressVariants}
                  custom={progress}
                />
              </Progress>
            </div>

            {/* Steps Grid */}
            <div className="grid gap-2 grid-cols-3">
              {steps.map((step, index) => {
                const isCompleted = getStepCompletion(step);
                return (
                  <motion.div
                    key={index}
                    variants={stepVariants}
                    whileHover={!isCompleted ? { scale: 1.02 } : undefined}
                    whileTap={!isCompleted ? { scale: 0.98 } : undefined}
                  >
                    <Card
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
                      <CardContent className="p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">{step.title}</h3>
                          <AnimatePresence mode="wait">
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <CheckCircle className="h-4 w-4 text-primary" />
                              </motion.div>
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </AnimatePresence>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {step.description}
                        </p>
                        {step.completionTool && (
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] px-1 py-0"
                            style={{ backgroundColor: secondaryColor, color: '#fff' }}
                          >
                            {step.completionTool}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confetti Component */}
      <Confetti active={confettiActive} />
    </motion.div>
  );
}
