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
  logo?: string | null;
  availableTools: string[];
  agentId: string;
  onStepsUpdated: () => void;
  primaryColor: string;
  secondaryColor: string;
  currentSessionId: string | null;
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
  logo = null,
  availableTools,
  agentId,
  onStepsUpdated,
  primaryColor,
  secondaryColor,
  currentSessionId,
}: OnboardingProgressSidebarProps) {
  const [confettiActive, setConfettiActive] = useState(false);
  const [completedStepsCount, setCompletedStepsCount] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [sessionSteps, setSessionSteps] = useState<Step[]>(steps);

  // Get step completion status based on session state
  const getStepCompletion = useCallback((step: Step): boolean => {
    if (!currentSessionId) return false;
    if (!step.completionTool || !availableTools.includes(step.completionTool)) return false;
    
    switch (step.completionTool) {
      case 'email': return emailSent;
      case 'notion': return notionMessageSent;
      case 'notesTaken': return notesTaken;
      case 'memory': return memoryKv[currentSessionId]?.hasMemory || false;
      default: return false;
    }
  }, [emailSent, notionMessageSent, notesTaken, availableTools, currentSessionId, memoryKv]);

  const fireConfetti = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 4000);
  }, []);

  // Update session steps
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

  // Load session steps when session changes
  useEffect(() => {
    const loadSessionSteps = async () => {
      if (!currentSessionId) {
        setSessionSteps(steps.map(step => ({ ...step, completed: false })));
        return;
      }

      try {
        const response = await fetch(`/api/getSessionSteps?sessionId=${currentSessionId}`);
        if (response.ok) {
          const data = await response.json();
          setSessionSteps(data.steps);
        }
      } catch (error) {
        console.error('Failed to load session steps:', error);
      }
    };

    loadSessionSteps();
  }, [currentSessionId, steps]);

  // Track completion progress
  useEffect(() => {
    if (!currentSessionId) return;

    const completedCount = sessionSteps.filter(step => getStepCompletion(step)).length;
    if (completedCount > completedStepsCount) {
      setCompletedStepsCount(completedCount);
      if (completedCount === sessionSteps.length) {
        fireConfetti();
      }
    }
  }, [sessionSteps, completedStepsCount, getStepCompletion, fireConfetti, currentSessionId]);

  // Reset states when logo changes
  useEffect(() => {
    setImgError(false);
  }, [logo]);

  if (!sessionSteps.length) return null;

  const completedSteps = sessionSteps.filter(step => getStepCompletion(step)).length;
  const progress = (completedSteps / sessionSteps.length) * 100;
  const isComplete = completedSteps === sessionSteps.length;

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
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800">
        <span className="text-2xl font-bold text-white">
          {title?.charAt(0) || "A"}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex-shrink-0 w-full bg-black sm:w-96 h-full overflow-scroll border-r border-gray-800"
    >
      {/* Session Badge */}
      <div className="sticky top-0 z-30 bg-black border-b border-gray-800 px-4 py-2">
        <div className="flex flex-col space-y-2">
          <Badge 
            variant="outline" 
            className="w-full justify-center text-xs"
          >
            Session ID: {currentSessionId || 'No Active Session'}
          </Badge>
          {!currentSessionId && (
            <p className="text-xs text-gray-500 text-center">
              Create or select a session to begin
            </p>
          )}
        </div>
      </div>

      {/* Header Section */}
      <div className="sticky top-12 bg-black z-20">
        {/* Banner and Avatar */}
        <div className="relative">
          <div 
            className="h-16 w-full"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
            }}
          />
          
          <div className="absolute left-6 -bottom-16">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-black bg-black">
                <div className="h-full w-full rounded-full overflow-hidden">
                  {renderAvatar()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 mt-20">
          <div className="space-y-1">
            <h2 className="text-xl text-white font-semibold">{title}</h2>
            <p className="text-sm text-gray-400">
              {currentSessionId ? 'Steps Completed' : 'Select Session to View Progress'}
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-2 mt-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="bg-gray-800 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-white">
                  {!currentSessionId ? "NO SESSION" : 
                    isComplete ? "100% COMPLETE" : `${Math.round(progress)}% COMPLETE`}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {currentSessionId ? `${sessionSteps.length - completedSteps} remaining` : '-'}
              </span>
            </div>

            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ 
                  width: currentSessionId ? `${progress}%` : '0%',
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
                {currentSessionId ? new Date().toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Est. Time</p>
              <p className="text-white text-sm mt-1 font-mono">
                {sessionSteps.length * 5}min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <nav className="px-6 mt-4" aria-label="Progress">
        {sessionSteps.map((step, index) => {
          const isCompleted = getStepCompletion(step);
          return (
            <motion.div
              key={index}
              variants={stepVariants}
              className="relative border-b border-gray-800 last:border-b-0"
            >
              <div 
                className={cn(
                  "p-4 transition-all group rounded-lg mb-2",
                  isCompleted ? "bg-gray-900/50" : "",
                  !currentSessionId && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <span className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full text-sm border transition-all",
                      isCompleted 
                        ? "border-green-500 bg-green-500/10 text-green-500" 
                        : "border-gray-600 text-gray-400"
                    )}>
                      {index + 1}
                    </span>
                  </div>

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
                    
                    <div className="mt-2 flex items-center space-x-4 text-[10px] text-gray-400">
                      <span className="flex items-center">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full mr-1",
                          isCompleted ? "bg-green-500" : "bg-gray-600"
                        )} />
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
            </motion.div>
          );
        })}
      </nav>

      <Confetti active={confettiActive} />
    </motion.div>
  );
}