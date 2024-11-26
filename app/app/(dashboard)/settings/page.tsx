// app/(dashboard)/settings/page.tsx
import Form from "@/components/form"; // Fixed import
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { editUser } from "@/lib/actions";
import db from "@/lib/db";
import { organizations, users, organizationMemberships, sites, agents } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Building2, Globe, Calendar, Users, Briefcase, Hash, User, Mail, BookMarked, Bot, Layout } from "lucide-react";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.organizationId) {
    redirect("/login");
  }

  // Fetch organization with extended metadata
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    with: {
      creator: true,
      sites: true,
    }
  });

  if (!org) {
    redirect("/login");
  }

  // Get organization stats
  const stats = await Promise.all([
    // Count members
    db.select({ count: count() }).from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, org.id)),
    // Count sites
    db.select({ count: count() }).from(sites)
      .where(eq(sites.organizationId, org.id)),
    // Count agents
    db.select({ count: count() }).from(agents)
      .where(eq(agents.createdBy, session.user.id))
  ]);

  const [membersCount, sitesCount, agentsCount] = stats.map(s => s[0].count);

  return (
    <div className="flex flex-col gap-8">
      {/* User Profile Settings */}
      <div className="grid grid-cols-2 gap-6">
        <div className="relative group p-6 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md shine shadow-dream">
          <div className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" style={{ filter: "blur(40px)" }} />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-custom-green" />
              <h2 className="font-cal text-2xl font-bold">Profile</h2>
            </div>
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
          </div>
        </div>

        <div className="relative group p-6 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md shine shadow-dream">
          <div className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" style={{ filter: "blur(40px)" }} />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-custom-green" />
              <h2 className="font-cal text-2xl font-bold">Email</h2>
            </div>
            <Form
              title="Email Address"
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
        </div>
      </div>

      {/* Organization Settings */}
      <div className="relative group p-6 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md shine shadow-dream">
        <div className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" style={{ filter: "blur(40px)" }} />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-custom-green" />
            <h2 className="font-cal text-2xl font-bold">Organization</h2>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <Form
              title="Organization Name"
              description="Your organization's display name."
              helpText="This is visible to all members."
              inputAttrs={{
                name: "orgName",
                type: "text",
                defaultValue: org.name,
                placeholder: "Acme Corp",
              }}
              handleSubmit={editUser}
            />

            <Form
              title="Organization Slug"
              description="Your organization's URL-friendly name."
              helpText="Used in URLs and API references."
              inputAttrs={{
                name: "orgSlug",
                type: "text",
                defaultValue: org.slug,
                placeholder: "acme-corp",
              }}
              handleSubmit={editUser}
            />
          </div>

          {/* Organization Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">Members</span>
              </div>
              <p className="text-2xl font-medium text-white">{membersCount}</p>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Layout className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">Sites</span>
              </div>
              <p className="text-2xl font-medium text-white">{sitesCount}</p>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">Agents</span>
              </div>
              <p className="text-2xl font-medium text-white">{agentsCount}</p>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">ID</span>
              </div>
              <p className="text-sm text-white truncate" title={org.id}>{org.id}</p>
            </div>
          </div>

          {/* Organization Metadata */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">Company Size</span>
              </div>
              <p className="text-sm text-white capitalize">
                {org.metadata?.companySize || 'Not specified'}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">Industry</span>
              </div>
              <p className="text-sm text-white">
                {org.metadata?.industry || 'Not specified'}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">Created</span>
              </div>
              <p className="text-sm text-white">
                {new Date(org.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <BookMarked className="w-4 h-4 text-custom-green" />
                <span className="text-sm text-neutral-400">Subscription</span>
              </div>
              <p className="text-sm text-white">
                {org.stripeSubscriptionId ? 'Active' : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}