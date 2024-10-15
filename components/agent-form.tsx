// components/agent-form.tsx

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAgent } from '@/lib/actions';

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
  settings: any;
}

export default function AgentForm({ agent }: { agent: Agent }) {
  const router = useRouter();
  const [name, setName] = useState(agent.name || '');
  const [description, setDescription] = useState(agent.description || '');
  const [headingText, setHeadingText] = useState(
    agent.settings?.headingText || 'AI Onboarding Platform'
  );
  const [isPending, startTransition] = useTransition();
  const [published, setPublished] = useState(agent.published);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedAgent = {
      ...agent,
      name,
      description,
      slug: agent.slug,
      published,
      settings: {
        ...agent.settings,
        headingText,
      },
    };

    try {
      await updateAgent(updatedAgent);
      setNotification({ message: 'Agent updated successfully', type: 'success' });
      setTimeout(() => {
        router.push(`/agent/${agent.id}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to update agent:', error);
      setNotification({ message: 'Failed to update agent', type: 'error' });
    }
  };

  const togglePublishStatus = () => {
    startTransition(() => {
      setPublished(!published);
    });
  };

  return (
    <div className="p-4">
      {notification && (
        <div className={`p-4 mb-4 rounded ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {notification.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold">Edit Agent</h1>
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            className="border rounded w-full p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="border rounded w-full p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Heading Text</label>
          <input
            className="border rounded w-full p-2"
            value={headingText}
            onChange={(e) => setHeadingText(e.target.value)}
          />
        </div>
        {/* Publish/Unpublish Button */}
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
          className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}