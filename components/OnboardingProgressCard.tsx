'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Step } from '@/lib/types';
import Confetti from './Confetti';

interface OnboardingProgressSidebarProps {
  emailSent: boolean;
  notesTaken: boolean;
  notionMessageSent: boolean;
  memoryKv: { [key: string]: any };
  steps?: Step[];
  title?: string;
  logo?: string | null; // Changed from avatarUrl to logo
  availableTools: string[];
  agentId: string;
  onStepsUpdated: () => void;
  primaryColor: string;
  secondaryColor: string;
}
const containerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
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

export default function OnboardingProgressSidebar({
  emailSent,
  notesTaken,
  notionMessageSent,
  memoryKv,
  steps = [],
  title = "401 CRM Agent",
  logo = null, // Changed from avatarUrl to logo with null default
  availableTools,
  agentId,
  onStepsUpdated,
  primaryColor,
  secondaryColor,
}: OnboardingProgressSidebarProps) {
  const [confettiActive, setConfettiActive] = useState(false);
  const [completedStepsCount, setCompletedStepsCount] = useState(0);

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
    setTimeout(() => setConfettiActive(false), 4000);
  }, []);

  const markStepCompleted = async (stepIndex: number) => {
    const updatedSteps = steps.map((step, index) =>
      index === stepIndex ? { ...step, completed: true } : step
    );

    try {
      const response = await fetch('/api/updateAgentSteps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, steps: updatedSteps }),
      });

      if (response.ok) {
        onStepsUpdated();
        if (updatedSteps.filter(step => step.completed).length === steps.length) {
          fireConfetti();
        }
      }
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

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
  const isComplete = completedSteps === steps.length;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex-shrink-0 w-full bg-black sm:w-96 h-full overflow-scroll border-r border-gray-800"
    >
      {/* Header Section */}
      <div className="sticky top-0 bg-black z-20">
        {/* Banner and Avatar */}
        <div className="relative">
          {/* Gradient Banner */}
          <div 
            className="h-16 w-full"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
            }}
          />
          
          {/* Avatar Container - Positioned to overlap banner */}
          <div className="absolute left-6 -bottom-16">
            <div className="relative">
              {/* Avatar Border */}
              <div className="h-24 w-24 rounded-full border-4 border-black bg-black">
                {/* Avatar Image */}
                <div className="h-full w-full rounded-full overflow-hidden bg-purple-600">
                  {logo ? (
                    <img src={logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-purple-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info - Adjusted spacing to account for overlapping avatar */}
        <div className="px-6 mt-20">
          <div className="space-y-1">
            <h2 className="text-xl text-white font-semibold">{title}</h2>
            <p className="text-sm text-gray-400">Steps Completed</p>
          </div>

          {/* Progress Section */}
          <div className="space-y-2 mt-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="bg-gray-800 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-white">
                  {isComplete ? "100% COMPLETE" : `${Math.round(progress)}% COMPLETE`}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {steps.length - completedSteps} remaining
              </span>
            </div>

            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: secondaryColor
                }}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-800">
            <div>
              <p className="text-gray-400 text-xs">Last Updated</p>
              <p className="text-white text-sm mt-1 font-mono">
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Est. Time</p>
              <p className="text-white text-sm mt-1 font-mono">
                {steps.length * 5}min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <nav className="px-6 mt-4" aria-label="Progress">
        {steps.map((step, index) => {
          const isCompleted = getStepCompletion(step);
          return (
            <motion.div
              key={index}
              variants={stepVariants}
              className="relative border-b border-gray-800 last:border-b-0"
            >
              <div 
                className={cn(
                  "p-4 hover:bg-gray-900 transition-all group rounded-lg mb-2",
                  isCompleted ? "bg-gray-900/50" : ""
                )}
                onClick={() => !isCompleted && markStepCompleted(index)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start space-x-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <span className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full text-sm border transition-all",
                      isCompleted 
                        ? "border-green-500 bg-green-500/10 text-green-500" 
                        : "border-gray-600 text-gray-400 group-hover:border-white group-hover:text-white"
                    )}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Step Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">
                        {step.title}
                      </h3>
                      {step.completionTool && (
                        <Badge 
                          variant="secondary" 
                          className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400"
                        >
                          {step.completionTool}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {step.description}
                    </p>
                    
                    {/* Rich Metadata */}
                    <div className="mt-2 flex items-center space-x-4 text-[10px] text-gray-400">
                      <span className="flex items-center">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full mr-1",
                          isCompleted ? "bg-green-500" : "bg-gray-600"
                        )} />
                        {isCompleted ? "Completed" : "Pending"}
                      </span>
                      {step.completionTool && (
                        <span className="flex items-center">
                          via {step.completionTool}
                        </span>
                      )}
                      <span>~5 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </nav>

      <Confetti active={confettiActive} />
    </motion.div>
  );
}