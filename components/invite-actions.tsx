// components/invite-actions.tsx
"use client";

import { useState } from 'react';
import { toast } from 'sonner';

interface InviteActionsProps {
  inviteId: string;
  email: string;
}

export function InviteActions({ inviteId, email }: InviteActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizations/invites/${inviteId}/resend`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to resend invite');
      
      toast.success(`Invite resent to ${email}`);
    } catch (error) {
      toast.error('Failed to resend invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizations/invites/${inviteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to cancel invite');
      
      toast.success(`Invite cancelled for ${email}`);
    } catch (error) {
      toast.error('Failed to cancel invite');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        disabled={isLoading}
        onClick={handleResend}
        className="px-3 py-1.5 rounded-lg text-sm text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20 transition-colors"
      >
        Resend
      </button>
      <button 
        disabled={isLoading}
        onClick={handleCancel}
        className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}