'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingDots from "@/components/icons/loading-dots";
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

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
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Mail className="h-4 w-4 text-neutral-500" />
        </div>
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-900/50 
            border border-white/[0.08] hover:border-white/[0.12] 
            focus:border-custom-green/50 focus:ring-custom-green/20
            text-sm transition-colors shadow-dream"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`
          relative group overflow-hidden px-4 py-2 rounded-lg font-medium 
          transition-all duration-300
          ${loading 
            ? 'bg-neutral-800 cursor-not-allowed opacity-50' 
            : 'bg-custom-green hover:bg-custom-green-light'
          }
          text-white shadow-dream hover:shadow-dream-lg
          border border-white/[0.08] hover:border-white/[0.12]
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-custom-green-light/0 
          via-white/[0.1] to-custom-green-light/0 
          opacity-0 group-hover:opacity-100 
          transform -translate-x-full group-hover:translate-x-full 
          transition-transform duration-1000" 
        />
        <span className="relative flex items-center gap-2">
          {loading ? (
            <LoadingDots color="#808080" />
          ) : (
            'Send Invite'
          )}
        </span>
      </button>
    </form>
  );
}