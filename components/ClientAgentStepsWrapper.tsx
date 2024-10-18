// components/ClientAgentStepsWrapper.tsx

'use client';

import { useCallback } from 'react';
import AgentStepsForm from '@/components/AgentStepsForm';
import { useRouter } from 'next/navigation';
import { Step } from '@/lib/schema';

interface ClientAgentStepsWrapperProps {
  agentId: string;
  existingSteps: Step[];
  tools: string[]; // Added
}

export default function ClientAgentStepsWrapper({
  agentId,
  existingSteps,
  tools, // Destructure
}: ClientAgentStepsWrapperProps) {
  const router = useRouter();

  const handleStepsUpdated = useCallback(() => {
    // Refresh the current route to fetch the updated agent data
    router.refresh();
  }, [router]);

  return (
    <AgentStepsForm
      agentId={agentId}
      existingSteps={existingSteps}
      onStepsUpdated={handleStepsUpdated} // Provide the required prop
      tools={tools} // Pass the tools
    />
  );
}
