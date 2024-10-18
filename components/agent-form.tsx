// components/agent-form.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UpdateAgentMetadataResponse } from '@/lib/types';

interface AgentSettings {
  headingText?: string;
  tools?: string[];
  initialMessage?: string;
  // ... any other settings
}

interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  userId: string | null;
  siteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
  image: string | null;
  imageBlurhash: string | null;
  settings: AgentSettings;
}

export default function AgentForm({ agent }: { agent: Agent }) {
  const router = useRouter();
  const [name, setName] = useState(agent.name ?? '');
  const [description, setDescription] = useState(agent.description ?? '');
  const [slug, setSlug] = useState(agent.slug ?? '');
  const [headingText, setHeadingText] = useState(
    agent.settings?.headingText ?? 'AI Onboarding Platform'
  );
  const [published, setPublished] = useState(agent.published ?? false);
  const [tools, setTools] = useState<string[]>(agent.settings?.tools ?? []);
  const [initialMessage, setInitialMessage] = useState(
    agent.settings?.initialMessage ?? ''
  );
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    setIsSubmitting(true);
  
    const updatedAgent = {
      name,
      description,
      slug,
      published,
      settings: {
        headingText,
        tools,
        initialMessage,
      },
    };
  
    const payload = {
      agentId: agent.id,
      ...updatedAgent,
    };
  
    try {
      const response = await fetch('/api/updateAgentGeneral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      // Check if response has a body
      let result: UpdateAgentMetadataResponse = { success: false };
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      }

      if (response.ok && result.success) {
        setNotification({
          message: 'Agent updated successfully',
          type: 'success',
        });
        // Navigate back to the agent page after a short delay
        setTimeout(() => {
          router.push(`/agent/${agent.id}`);
        }, 2000);
      } else {
        setNotification({
          message: result.error || 'Failed to update agent',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to update agent:', error);
      setNotification({
        message: 'Failed to update agent',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePublishStatus = () => {
    setPublished(!published);
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
        <h1 className="text-2xl font-bold">Edit Agent</h1>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="border rounded w-full p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="border rounded w-full p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            className="border rounded w-full p-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Heading Text</label>
          <input
            className="border rounded w-full p-2"
            value={headingText}
            onChange={(e) => setHeadingText(e.target.value)}
          />
        </div>

        {/* Tools Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Tools</label>
          <div className="space-y-2">
            {['memory', 'email', 'notion'].map((tool) => (
              <div key={tool} className="flex items-center">
                <input
                  type="checkbox"
                  id={tool}
                  checked={tools.includes(tool)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTools([...tools, tool]);
                    } else {
                      setTools(tools.filter((t) => t !== tool));
                    }
                  }}
                  className="mr-2"
                />
                <label htmlFor={tool} className="text-sm">
                  {tool.charAt(0).toUpperCase() + tool.slice(1)}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Initial Input Text */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Initial Input Text
          </label>
          <textarea
            className="border rounded w-full p-2"
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="Enter the initial message for the conversation"
            rows={4}
          />
        </div>

        {/* Publish/Unpublish Button */}
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={togglePublishStatus}
            className={`${
              published ? 'bg-red-600' : 'bg-green-600'
            } text-white px-4 py-2 rounded`}
          >
            {published ? 'Unpublish' : 'Publish'}
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
