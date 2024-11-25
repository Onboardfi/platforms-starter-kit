// components/pending-invites.tsx
'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SelectOrganizationInvite } from "@/lib/schema";

interface PendingInvitesProps {
  invites: Array<SelectOrganizationInvite & {
    inviter: {
      name: string | null;
    }
  }>;
  organizationId: string;
}

export function PendingInvites({ invites, organizationId }: PendingInvitesProps) {
  const router = useRouter();

  const handleCancel = async (inviteId: string) => {
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

  if (invites.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium dark:text-white">Pending Invites</h3>
      <div className="mt-4 divide-y divide-gray-200">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium dark:text-white">{invite.email}</p>
              <p className="text-sm text-gray-500">
                Invited by {invite.inviter.name} on{' '}
                {new Date(invite.invitedAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleCancel(invite.id)}
              className="text-sm text-red-600 hover:text-red-500"
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}