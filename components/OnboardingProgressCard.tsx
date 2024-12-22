'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Step } from '@/lib/types';
import Confetti from './Confetti';
import { useOnboardingNotification } from '@/hooks/useOnboardingNotification';

interface OnboardingProgressSidebarProps {
  emailSent: boolean;
  notesTaken: boolean;
  notionMessageSent: boolean;
  mondayLeadCreated: boolean;
  memoryKv: { [key: string]: any };
  steps: Step[];
  title?: string;
  logo?: string | null;
  availableTools: string[];
  agentId: string;
  onStepsUpdated: () => void;
  primaryColor: string;
  secondaryColor: string;
  currentSessionId: string | null;
}

export default function OnboardingProgressSidebar({
  emailSent,
  notesTaken,
  notionMessageSent,
  mondayLeadCreated,
  memoryKv,
  steps = [],
  title = "401 CRM Agent",
  logo = null,
  availableTools,
  agentId,
  onStepsUpdated,
  primaryColor,
  secondaryColor,
  currentSessionId,
}: OnboardingProgressSidebarProps) {
  // Component state
  const [confettiActive, setConfettiActive] = useState(false);
  const [completedStepsCount, setCompletedStepsCount] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [sessionSteps, setSessionSteps] = useState<Step[]>(steps);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);
  
  const { sendCompletionNotification } = useOnboardingNotification();

  // Update session steps when props change
  useEffect(() => {
    setSessionSteps(steps);
  }, [steps]);

  // Reset completion states when session changes
  useEffect(() => {
    setHasNotifiedCompletion(false);
    setCompletedStepsCount(0);
  }, [currentSessionId]);

  // Determine if a step is completed
  const getStepCompletion = useCallback((step: Step): boolean => {
    if (!currentSessionId) return false;
    if (!step.completionTool || !availableTools.includes(step.completionTool)) return false;
  
    switch (step.completionTool) {
      case 'email': return emailSent;
      case 'notion': return notionMessageSent;
      case 'notesTaken': return notesTaken;
      case 'memory': return memoryKv[currentSessionId]?.hasMemory || false;
      case 'monday': return mondayLeadCreated;
      default: return false;
    }
  }, [
    emailSent, 
    notionMessageSent, 
    notesTaken, 
    mondayLeadCreated, 
    availableTools, 
    currentSessionId, 
    memoryKv
  ]);

  // Handle confetti animation
  const fireConfetti = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 4000);
  }, []);

  // Update steps in database
  const updateSessionSteps = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      const response = await fetch('/api/updateSessionSteps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          sessionId: currentSessionId,
          steps: sessionSteps
        }),
      });

      if (response.ok) {
        onStepsUpdated();
      }
    } catch (error) {
      console.error('Failed to update session steps:', error);
    }
  }, [currentSessionId, agentId, sessionSteps, onStepsUpdated]);

  // Track completion status and send notifications
  useEffect(() => {
    if (!currentSessionId) return;

    const completedCount = sessionSteps.filter(step => getStepCompletion(step)).length;
    if (completedCount > completedStepsCount) {
      setCompletedStepsCount(completedCount);

      // Check if all steps are completed
      if (completedCount === sessionSteps.length && !hasNotifiedCompletion) {
        fireConfetti();
        // Send notification with agentId
        sendCompletionNotification({
          sessionId: currentSessionId,
          agentId,
          agentName: title,
          totalSteps: sessionSteps.length,
        }).then(() => {
          setHasNotifiedCompletion(true);
        }).catch(console.error);
      }
    }
  }, [
    sessionSteps,
    completedStepsCount,
    getStepCompletion,
    fireConfetti,
    currentSessionId,
    hasNotifiedCompletion,
    agentId,
    title,
    sendCompletionNotification
  ]);

  // Update completion count when states change
  useEffect(() => {
    if (!currentSessionId) return;
    const completedCount = sessionSteps.filter(step => getStepCompletion(step)).length;
    setCompletedStepsCount(completedCount);
    if (completedCount === sessionSteps.length && !hasNotifiedCompletion) {
      fireConfetti();
    }
  }, [
    emailSent,
    notesTaken,
    notionMessageSent,
    mondayLeadCreated,
    memoryKv,
    currentSessionId,
    sessionSteps,
    getStepCompletion,
    hasNotifiedCompletion,
    fireConfetti
  ]);

  // Reset image error state
  useEffect(() => {
    setImgError(false);
  }, [logo]);

  if (!sessionSteps.length) return null;

  const completedSteps = sessionSteps.filter(step => getStepCompletion(step)).length;
  const progress = (completedSteps / sessionSteps.length) * 100;

  // Helper render functions
  const renderAvatar = () => {
    if (logo && !imgError) {
      return (
        <img
          src={logo}
          alt={`${title} logo`}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      );
    }

    return (
      <div
        className="h-full w-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
        }}
      >
        <span className="text-2xl font-bold text-white">
          {title?.charAt(0) || "A"}
        </span>
      </div>
    );
  };

  const renderToolIndicator = (tool: string | null) => {
    if (!tool) return null;

    if (tool === 'monday') {
      return (
        <div className="h-8 w-8 rounded overflow-hidden bg-white/5 border border-white/10 p-0.5">
          <img
            src="/monday.png"
            alt="Monday.com"
            className="h-full w-full object-contain"
          />
        </div>
      );
    }

    return (
      <Badge
        variant="outline"
        className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border-white/10 text-white/50 shine"
      >
        {tool}
      </Badge>
    );
  };

  return (
    <div className="flex-shrink-0 w-full sm:w-96 h-full overflow-scroll bg-background/60 backdrop-blur-dream border-r border-white/10 shadow-dream-lg">
      <div className="sticky top-0 bg-background/60 backdrop-blur-dream z-20 shine">
        {/* Header Section */}
        <div className="relative h-32">
          {/* Background Gradient */}
          <div
            className="w-full h-full rounded-t-none"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
            }}
          />

          {/* Avatar */}
          <div className="absolute -bottom-12 left-6">
            <div className="h-24 w-24 rounded-2xl border-4 border-background/70 backdrop-blur-dream bg-background/70 shadow-dream overflow-hidden shine">
              {renderAvatar()}
            </div>
          </div>

          {/* Session Status Badge */}
          <div className="absolute top-4 right-4">
            <Badge
              variant="outline"
              className={cn(
                "px-3 py-1 rounded-xl backdrop-blur-md text-xs text-white border border-white/10 shine",
                currentSessionId ? "bg-white/10 border-white/20" : "bg-neutral-900/50"
              )}
            >
              {currentSessionId ? "Active Session" : "No Session"}
            </Badge>
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-6 pt-16">
          {/* Title */}
          <div className="space-y-2">
            <h2 className="font-cal text-xl text-white">{title}</h2>
            <p className="text-sm text-neutral-400">
              {currentSessionId ? 'Steps Completed' : 'Select Session to View Progress'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mt-4 mb-6 p-3 rounded-xl bg-background/70 backdrop-blur-dream shine">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">
                {!currentSessionId ? "NO SESSION" :
                  `${sessionSteps.length - completedSteps} steps remaining`}
              </span>
              <span
                className="font-semibold"
                style={{ color: secondaryColor }}
              >
                {currentSessionId ? `${Math.round(progress)}%` : '0%'}
              </span>
            </div>

            <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: currentSessionId ? `${progress}%` : '0%',
                  background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                }}
              />
            </div>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/[0.08]">
            <div>
              <p className="text-neutral-500 text-xs">Last Updated</p>
              <p className="text-sm mt-1 font-mono text-neutral-300">
                {currentSessionId ? new Date().toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs">Est. Time</p>
              <p className="text-sm mt-1 font-mono text-neutral-300">
                {sessionSteps.length * 5}min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <nav className="px-6 mt-6" aria-label="Progress">
        {sessionSteps.map((step, index) => {
          const isCompleted = getStepCompletion(step);
          return (
            <div
              key={index}
              className="relative mb-4 last:mb-0"
            >
              <div
                className={cn(
                  "p-4 rounded-xl shine",
                  "bg-background/70 backdrop-blur-dream",
                  !currentSessionId && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-start space-x-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <span
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-xl text-sm border shine",
                        isCompleted
                          ? "text-white"
                          : "border-white/10 text-white/50"
                      )}
                      style={{
                        background: isCompleted ? secondaryColor : 'transparent',
                        borderColor: isCompleted ? secondaryColor : undefined,
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Step Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white/90">
                        {step.title}
                      </h3>
                      {renderToolIndicator(step.completionTool)}
                    </div>

                    <p className="mt-2 text-sm text-neutral-400 font-light">
                      {step.description}
                    </p>

                    {/* Step Status */}
                    <div className="mt-3 flex items-center space-x-4 text-[10px] text-neutral-500">
                      <span className="flex items-center">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full mr-1.5",
                          )}
                          style={{
                            backgroundColor: isCompleted ? secondaryColor : 'white',
                            opacity: isCompleted ? 1 : 0.2,
                          }}
                        />
                        {!currentSessionId ? "No Session" :
                          isCompleted ? "Completed" : "Pending"}
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
            </div>
          );
        })}
      </nav>

      <Confetti active={confettiActive} />
    </div>
  );
}