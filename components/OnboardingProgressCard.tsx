// components/OnboardingProgressCard.tsx

import React, { useEffect, useState } from 'react';
import { Circle } from 'lucide-react';
import { Step } from '@/lib/schema';

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
}

const OnboardingProgressCard: React.FC<OnboardingProgressCardProps> = ({
  emailSent,
  notesTaken,
  notionMessageSent,
  memoryKv,
  steps = [],
  headingText,
  availableTools,
  agentId,
  onStepsUpdated,
}) => {
  const [clientName, setClientName] = useState('');

  const markStepCompleted = async (stepIndex: number) => {
    const updatedSteps = steps.map((step, index) =>
      index === stepIndex ? { ...step, completed: true } : step
    );
  
    try {
      const response = await fetch('/api/updateAgentGeneral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          settings: { steps: updatedSteps },
        }),
      });
  
      const result = await response.json();
  
      if (result.success) {
        console.log(`Step ${stepIndex} marked as complete.`);
        onStepsUpdated(); // Trigger re-fetch of agent data
      } else {
        console.error(`Failed to update step: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };
  

  const getStepCompletion = (step: Step) => {
    if (step.completed) {
      return true;
    }
    if (!step.completionTool || !availableTools.includes(step.completionTool)) {
      return false;
    }
    switch (step.completionTool) {
      case 'email':
        return emailSent;
      case 'notion':
        return notionMessageSent;
      case 'notesTaken':
        return notesTaken;
      case 'memory':
        return true;
      default:
        return false;
    }
  };

  const completedSteps = steps.filter((step) => getStepCompletion(step)).length;
  const allStagesComplete = steps.length > 0 && steps.every((step) => getStepCompletion(step));

  useEffect(() => {
    const firstName = memoryKv.first_name || '';
    const lastName = memoryKv.last_name || '';
    if (firstName || lastName) {
      setClientName(`${firstName} ${lastName}`.trim());
    }
  }, [memoryKv]);

  const OnboardingState = () => (
    <div className="w-full max-w-md mx-auto overflow-hidden shadow-lg font-sans rounded-lg">
      <div className="bg-white p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {headingText || 'Client Onboarding Progress'}
        </h2>
        <div className="relative">
          <div className="absolute left-2 inset-y-0 w-0.5 bg-gray-200" />
          {completedSteps > 0 && (
            <div
              className="absolute left-2 top-0 w-0.5 bg-green-500 transition-all duration-500 ease-in-out"
              style={{ height: `${(completedSteps / steps.length) * 100}%` }}
            />
          )}
          {steps.length === 0 && (
            <p className="text-gray-500">No onboarding steps defined.</p>
          )}
          {steps.map((step, index) => {
            const isCompleted = getStepCompletion(step);
            return (
              <div key={index} className="relative flex items-start mb-8 last:mb-0">
                <div className="absolute left-0 mt-1">
                  <Circle
                    className={`w-4 h-4 ${
                      isCompleted ? 'text-green-500 fill-current' : 'text-gray-300'
                    }`}
                  />
                </div>
                <div className="ml-8">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  <p className="text-sm text-gray-600">
                    Completion Tool: {step.completionTool || 'Not set'}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      isCompleted ? 'text-green-500' : 'text-blue-500'
                    }`}
                  >
                    {isCompleted ? 'COMPLETE' : 'UPCOMING'}
                  </p>
                  {!isCompleted && (
                    <button
                      className="mt-2 text-blue-600 hover:underline"
                      onClick={() => markStepCompleted(index)}
                      disabled={!step.completionTool}
                    >
                      Mark as Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {allStagesComplete && (
        <div className="bg-green-100 p-4 text-green-700 text-center">
          All onboarding stages are complete!
        </div>
      )}
    </div>
  );

  const DefaultState = () => (
    <div className="w-full max-w-md mx-auto overflow-hidden shadow-lg font-sans rounded-lg">
      <div className="h-64 bg-gradient-to-b from-blue-600 via-blue-400 to-white p-6 flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-4 text-white text-center">
          {headingText || 'AI Onboarding Platform'}
        </h1>
        <button className="bg-white text-blue-600 font-semibold py-2 px-4 rounded-full shadow-md hover:bg-blue-50 transition duration-300">
          Start New Onboarding
        </button>
      </div>
    </div>
  );

  return steps.length > 0 ? <OnboardingState /> : <DefaultState />;
};

export default OnboardingProgressCard;