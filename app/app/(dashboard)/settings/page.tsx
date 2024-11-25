// app/app/(dashboard)/settings/page.tsx

import { ReactNode } from "react";
import Form from "@/components/form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { editUser } from "@/lib/actions";
import { InviteMemberForm } from "@/components/invite-member-form";
import db from "@/lib/db";
import { 
  organizationInvites, 
  organizationMemberships,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { MemberList } from "@/components/member-list";
import { PendingInvites } from "@/components/pending-invites";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.organizationId) {
    redirect("/login");
  }

  // Fetch pending invites
  const pendingInvites = await db.query.organizationInvites.findMany({
    where: and(
      eq(organizationInvites.organizationId, session.organizationId),
      eq(organizationInvites.status, 'pending')
    ),
    with: {
      inviter: true,
    },
  });

  // Fetch current members
  const members = await db.query.organizationMemberships.findMany({
    where: eq(organizationMemberships.organizationId, session.organizationId),
    with: {
      user: true,
    },
  });

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-8">
      <div className="flex flex-col space-y-6">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Settings
        </h1>
        
        <div className="flex flex-col space-y-6">
          <h2 className="font-cal text-2xl font-bold dark:text-white">
            Profile
          </h2>
          <Form
            title="Name"
            description="Your name on this app."
            helpText="Please use 32 characters maximum."
            inputAttrs={{
              name: "name",
              type: "text",
              defaultValue: session.user.name!,
              placeholder: "Brendon Urie",
              maxLength: 32,
            }}
            handleSubmit={editUser}
          />
          <Form
            title="Email"
            description="Your email on this app."
            helpText="Please enter a valid email."
            inputAttrs={{
              name: "email",
              type: "email",
              defaultValue: session.user.email!,
              placeholder: "panic@thedis.co",
            }}
            handleSubmit={editUser}
          />
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="font-cal text-2xl font-bold dark:text-white">
            Team Members
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Invite your team members to collaborate.
          </p>

          <div className="mt-6">
            <InviteMemberForm organizationId={session.organizationId} />
          </div>

          {/* Current Members */}
          <div className="mt-8">
            <h3 className="text-lg font-medium dark:text-white">Current Members</h3>
            <MemberList members={members} />
          </div>

          {/* Pending Invites */}
          <PendingInvites 
            invites={pendingInvites}
            organizationId={session.organizationId}
          />
        </div>
      </div>
    </div>
  );
}