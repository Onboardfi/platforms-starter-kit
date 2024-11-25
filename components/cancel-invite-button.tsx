// components/cancel-invite-button.tsx
'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CancelInviteButtonProps {
  inviteId: string;
  organizationId: string;
}

export function CancelInviteButton({ inviteId, organizationId }: CancelInviteButtonProps) {
  const router = useRouter();

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/invites`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteId }),
      });

      if (!res.ok) {
        throw new Error('Failed to cancel invite');
      }

      toast.success('Invite cancelled successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel invite');
    }
  };

  return (
    <button
      onClick={handleCancel}
      className="text-sm text-red-600 hover:text-red-500"
    >
      Cancel
    </button>
  );
}