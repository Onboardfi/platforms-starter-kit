// app/(dashboard)/settings/teams/member-actions.tsx
"use client";

import { useState } from 'react';
import { toast } from 'sonner';

type MemberRole = 'owner' | 'admin' | 'member';

interface MemberActionsProps {
  memberId: string;
  memberRole: MemberRole;
  currentUserRole: MemberRole;
}

export function MemberActions({ memberId, memberRole, currentUserRole }: MemberActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Can only manage if current user has higher role
  const rolesHierarchy = { 'owner': 3, 'admin': 2, 'member': 1 };
  const canManage = rolesHierarchy[currentUserRole] > rolesHierarchy[memberRole];

  if (!canManage) return null;

  return (
    <button 
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          // Add your management functionality here
          toast.success('Member role updated');
        } catch (error) {
          toast.error('Failed to update member');
        } finally {
          setIsLoading(false);
        }
      }}
      className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors disabled:opacity-50"
    >
      Manage
    </button>
  );
}