
// ClientAgentStepsWrapper.tsx
'use client';

import { useCallback } from 'react';
import AgentStepsForm from '@/components/AgentStepsForm';
import { useRouter } from 'next/navigation';
import { Step } from '@/lib/schema';

interface ClientAgentStepsWrapperProps {
  existingSteps: Step[];
  tools: string[];
}

export default function ClientAgentStepsWrapper({
  existingSteps,
  tools,
}: ClientAgentStepsWrapperProps) {
  const router = useRouter();

  const handleStepsUpdated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <AgentStepsForm
      existingSteps={existingSteps}
      onStepsUpdated={handleStepsUpdated}
      tools={tools}
    />
  );
}