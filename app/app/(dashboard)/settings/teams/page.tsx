// app/(dashboard)/settings/teams/page.tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { organizationInvites, organizationMemberships } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { InviteMemberForm } from "@/components/invite-member-form";
import { UserCircle, Calendar, Mail, Shield, Clock } from "lucide-react";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session?.organizationId) {
    redirect("/login");
  }

  // Fetch members with extended metadata
  const members = await db.query.organizationMemberships.findMany({
    where: eq(organizationMemberships.organizationId, session.organizationId),
    with: {
      user: true,
    },
    orderBy: (memberships, { desc }) => [desc(memberships.createdAt)],
  });

  // Fetch pending invites
  const pendingInvites = await db.query.organizationInvites.findMany({
    where: and(
      eq(organizationInvites.organizationId, session.organizationId),
      eq(organizationInvites.status, 'pending')
    ),
    with: {
      inviter: true,
    },
    orderBy: (invites, { desc }) => [desc(invites.invitedAt)],
  });

  return (
    <div className="space-y-8">
      {/* Invite Section */}
      <div className="relative group p-6 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md shine shadow-dream">
        <div className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" style={{ filter: "blur(40px)" }} />
        
        <div className="relative">
          <h2 className="font-cal text-2xl font-bold mb-2">Invite Team Members</h2>
          <p className="text-sm text-neutral-400 mb-6">
            Add members to your organization to collaborate on projects.
          </p>
          
          <InviteMemberForm organizationId={session.organizationId} />
        </div>
      </div>

      {/* Active Members Section */}
      <div className="relative group p-6 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md shine shadow-dream">
        <div className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" style={{ filter: "blur(40px)" }} />
        
        <div className="relative">
          <h2 className="font-cal text-2xl font-bold mb-6">Active Members</h2>
          
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name || ''}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <UserCircle className="w-10 h-10 text-neutral-400" />
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-custom-green border-2 border-neutral-900" />
                    </div>
                    
                    <div>
                      <p className="font-medium text-white">
                        {member.user.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <Mail className="w-3 h-3" />
                        {member.user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-custom-green" />
                        <span className="text-sm text-white capitalize">
                          {member.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-400">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(member.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <button className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="relative group p-6 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md shine shadow-dream">
          <div className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" style={{ filter: "blur(40px)" }} />
          
          <div className="relative">
            <h2 className="font-cal text-2xl font-bold mb-6">Pending Invites</h2>
            
            <div className="space-y-4">
            {pendingInvites.map((invite) => (
                <div key={invite.id} className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                          <Mail className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 border-2 border-neutral-900" />
                      </div>
                      
                      <div>
                        <p className="font-medium text-white">
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-custom-green" />
                          <span className="text-sm text-white capitalize">
                            {invite.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-neutral-400">
                          <span>Invited by</span>
                          <span className="text-white">{invite.inviter.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          className="px-3 py-1.5 rounded-lg text-sm text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20 transition-colors"
                          onClick={() => {
                            // Resend invite functionality
                          }}
                        >
                          Resend
                        </button>
                        <button 
                          className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 transition-colors"
                          onClick={() => {
                            // Cancel invite functionality
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}