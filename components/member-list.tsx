// components/member-list.tsx
'use client';

import { SelectOrganizationMembership } from "@/lib/schema";

interface MemberListProps {
  members: Array<SelectOrganizationMembership & {
    user: {
      name: string | null;
      email: string;
      image: string | null;
    }
  }>;
}

export function MemberList({ members }: MemberListProps) {
  return (
    <div className="mt-4 divide-y divide-gray-200">
      {members.map((member) => (
        <div key={member.id} className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-3">
            <img
              src={member.user.image || `https://avatars.dicebear.com/api/initials/${member.user.name}.svg`}
              alt={member.user.name || 'Member'}
              className="h-10 w-10 rounded-full"
            />
            <div>
              <p className="font-medium dark:text-white">{member.user.name}</p>
              <p className="text-sm text-gray-500">{member.user.email}</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            {member.role}
          </span>
        </div>
      ))}
    </div>
  );
}