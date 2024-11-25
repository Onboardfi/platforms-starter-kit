// components/invite-member-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingDots from "@/components/icons/loading-dots";
import { toast } from 'sonner';

interface InviteMemberFormProps {
  organizationId: string;
}

export function InviteMemberForm({ organizationId }: InviteMemberFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/organizations/${organizationId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: 'member',
        }),
      });

      const data = await res.json().catch(() => null);
      
      if (!res.ok) {
        throw new Error(
          data?.message || 
          data?.error || 
          'Failed to send invite'
        );
      }

      toast.success('Invitation sent successfully!');
      setEmail('');
      router.refresh();
    } catch (error) {
      console.error('Invite error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Email Address
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            type="email"
            name="email"
            id="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`${
          loading
            ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800'
            : 'bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100'
        } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
      >
        {loading ? (
          <LoadingDots color="#808080" />
        ) : (
          <p>Send Invitation</p>
        )}
      </button>
    </form>
  );
}