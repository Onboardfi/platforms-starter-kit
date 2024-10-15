/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { Circle, Settings, Link, ChevronRight } from 'lucide-react';

interface OnboardingProgressCardProps {
  emailSent: boolean;
  notesTaken: boolean;
  onAllStagesComplete: () => void;
  memoryKv: { [key: string]: any };


  headingText?: string; // Add this prop

}

const OnboardingProgressCard: React.FC<OnboardingProgressCardProps> = ({ 
  emailSent, 
  notesTaken, 
  onAllStagesComplete,
  memoryKv,
  headingText // Add this line

}) => {
  const [showContent, setShowContent] = useState(false);
  const [clientName, setClientName] = useState('');

  const steps = [
    { title: 'Add client to CRM', description: 'Clients profile added to your CRM system', completed: true },
    { title: 'Send welcome email', description: 'Onboarding email sent to new client', completed: emailSent },
    { title: 'Take conversation notes', description: 'Key points from client conversation summarized', completed: notesTaken },
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const allStagesComplete = steps.every(step => step.completed);

  useEffect(() => {
    if (allStagesComplete) {
      onAllStagesComplete();
    }
  }, [allStagesComplete, onAllStagesComplete]);

  useEffect(() => {
    if (Object.keys(memoryKv).length > 0) {
      setShowContent(true);
    }

    const firstName = memoryKv.first_name || '';
    const lastName = memoryKv.last_name || '';
    if (firstName || lastName) {
      setClientName(`${firstName} ${lastName}`.trim());
    }
  }, [memoryKv]);

  const DefaultState = () => (
    <div className="w-full max-w-md mx-auto overflow-hidden shadow-lg font-sans rounded-lg">
      <div className="h-64 bg-gradient-to-b from-blue-600 via-blue-400 to-white p-6">
      <h1 className="text-3xl font-bold mb-4 text-white">
        {headingText || 'AI Onboarding Platform'}
      </h1>
        <button className="bg-white text-blue-600 font-semibold py-2 px-4 rounded-full shadow-md hover:bg-blue-50 transition duration-300">
          Start New Onboarding
        </button>
      </div>
      
      <div className="bg-white p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Previous Onboarding Sessions</h2>
        <div className="space-y-4">
          {['John Doe', 'Jane Smith', 'Alice Johnson'].map((name, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <span className="font-medium text-gray-700">{name}</span>
              <ChevronRight className="text-gray-400" />
            </div>
          ))}
        </div>
        
        <div className="mt-8 space-y-4">
          <button className="w-full flex items-center justify-between bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition duration-300">
            <div className="flex items-center">
              <Settings className="mr-3 text-gray-600" />
              <span className="font-medium text-gray-700">Settings</span>
            </div>
            <ChevronRight className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition duration-300">
            <div className="flex items-center">
              <Link className="mr-3 text-gray-600" />
              <span className="font-medium text-gray-700">API Connections</span>
            </div>
            <ChevronRight className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );

  const OnboardingState = () => (
    <div className="w-full max-w-md mx-auto overflow-hidden shadow-lg font-sans rounded-lg">
      <div className="h-64 bg-gradient-to-b from-blue-600 via-blue-400 to-white p-6">
        <h1 className="text-3xl font-bold mb-4 text-white">You&lsquo;re almost there.</h1>
        <div className="bg-white rounded-lg p-4 text-gray-800 shadow-md">
          <h2 className="text-xl font-semibold mb-2">
            {clientName ? `${clientName} Onboarding` : 'Client Onboarding'}
          </h2>
          <ul className="list-disc pl-5">
            {memoryKv.tasks ? (
              memoryKv.tasks.map((task: string, index: number) => (
                <li key={index}>{task}</li>
              ))
            ) : (
              <>
                <li>Review disclosures</li>
                <li>Schedule closing appointment</li>
              </>
            )}
          </ul>
        </div>
      </div>
      
      <div className="bg-white p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Client Onboarding Progress</h2>
        <div className="relative">
          <div className="absolute left-2 inset-y-0 w-0.5 bg-gray-200" />
          {completedSteps > 0 && (
            <div 
              className="absolute left-2 inset-y-0 w-0.5 bg-green-500 transition-all duration-500 ease-in-out" 
              style={{ height: `${(completedSteps / steps.length) * 100}%` }}
            />
          )}
          {steps.map((step, index) => (
            <div key={index} className="relative flex items-start mb-8 last:mb-0">
              <div className="absolute left-0 mt-1">
                <Circle
                  className={`w-4 h-4 ${step.completed ? 'text-green-500 fill-current' : 'text-gray-300'}`}
                />
              </div>
              <div className="ml-8">
                <h3 className="text-lg font-semibold text-gray-800">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
                <p className={`text-sm font-semibold ${step.completed ? 'text-green-500' : 'text-blue-500'}`}>
                  {step.completed ? 'COMPLETE' : 'UPCOMING'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return showContent ? <OnboardingState /> : <DefaultState />;
};

export default OnboardingProgressCard;