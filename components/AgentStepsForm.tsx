// components/AgentStepsForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentSettings, Step } from '@/lib/schema';
import { UpdateAgentMetadataResponse } from '@/lib/types';

interface AgentStepsFormProps {
  agentId: string;
  existingSteps?: Step[];
  onStepsUpdated: () => void; // Existing prop
  tools: string[]; // Added prop
}

export default function AgentStepsForm({
  agentId,
  existingSteps = [],
  onStepsUpdated,
  tools, // Destructure
}: AgentStepsFormProps) {
  const [steps, setSteps] = useState<Step[]>(existingSteps);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const addStep = () => {
    setSteps([
      ...steps,
      { title: '', description: '', completionTool: null },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const handleStepChange = <K extends keyof Step>(
    index: number,
    field: K,
    value: Step[K]
  ) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/updateAgentGeneral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          settings: { steps },
        }),
      });

      const result: UpdateAgentMetadataResponse = await response.json();

      if (response.ok && result.success) {
        setNotification({
          message: 'Steps updated successfully',
          type: 'success',
        });
        // Notify parent component to refresh agent data
        onStepsUpdated();
      } else {
        setNotification({
          message: result.error || 'Failed to update steps',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to update steps:', error);
      setNotification({
        message: 'Failed to update steps',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      {notification && (
        <div
          className={`p-4 mb-4 rounded ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {notification.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="text-2xl font-bold">Agent Steps</h1>

        {steps.map((step, index) => (
          <div key={index} className="border p-4 rounded space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Step {index + 1}</h2>
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="text-red-600"
              >
                Remove
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                className="border rounded w-full p-2"
                value={step.title}
                onChange={(e) =>
                  handleStepChange(index, 'title', e.target.value)
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                className="border rounded w-full p-2"
                value={step.description}
                onChange={(e) =>
                  handleStepChange(index, 'description', e.target.value)
                }
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Completion Status
              </label>
              <select
                className="border rounded w-full p-2"
                value={step.completionTool || ''}
                onChange={(e) =>
                  handleStepChange(
                    index,
                    'completionTool',
                    e.target.value === ''
                      ? null
                      : (e.target.value as Step['completionTool'])
                  )
                }
              >
                <option value="">Select a tool</option>
                {tools.map((tool) => (
                  <option key={tool} value={tool}>
                    {tool.charAt(0).toUpperCase() + tool.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addStep}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Step
        </button>

        <div>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Steps'}
          </button>
        </div>
      </form>
    </div>
  );
}
