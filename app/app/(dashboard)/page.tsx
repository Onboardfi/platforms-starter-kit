// /Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/app/(dashboard)/page.tsx

import { Suspense } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/parts/breadcrumbs";
import { Header } from "@/components/parts/header";
import { Chart } from "@/components/dashboard/chart";
import { PageWrapper } from "@/components/parts/page-wrapper";
import { getAgentAndSiteCounts } from "@/lib/data/dashboard";
import { notFound, redirect } from "next/navigation";
import { getAgents } from "@/lib/data/agents";
import { getSites } from "@/lib/data/sites";
import { getUsageForUser, getCurrentSubscriptionTier } from "@/lib/data/users";
import { Usage } from "@/components/parts/usage";
import { AgentsDataTable } from "@/components/groups/agents/data-table";
import { SitesDataTable } from "@/components/groups/sites/data-table";
import { getSession } from "@/lib/auth";
import { CreateAgentBanner } from "@/components/CreateAgentBanner";
import type { SelectAgent } from "@/lib/schema";

const pageData = {
  name: "Dashboard",
  title: "Dashboard",
  description: "Snapshot of your onboards and usage",
};

function transformToSelectAgent(agent: any): SelectAgent {
  return {
    ...agent,
    site: agent.site
      ? {
          ...agent.site,
          organization: agent.site.organization || null,
          creator: agent.site.creator || null,
        }
      : undefined,
    creator: agent.creator || {
      id: agent.createdBy,
      name: null,
      username: null,
      gh_username: null,
      email: "",
      emailVerified: null,
      image: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    siteName: agent.site?.name ?? null,
    settings: agent.settings || {
      onboardingType: "external",
      allowMultipleSessions: false,
      authentication: {
        enabled: false,
        message: "",
      },
    },
  };
}

export default async function Page() {
  const session = await getSession();
  if (!session?.user.id || !session.organizationId) {
    redirect("/login");
  }

  const charts = await getAgentAndSiteCounts();
  const agents = await getAgents();
  const sites = await getSites();
  const usage = await getUsageForUser();
  const currentTier = await getCurrentSubscriptionTier(session.organizationId);

  const { data: chartData } = charts || {};
  const { data: agentsData } = agents || {};
  const { data: sitesData } = sites || {};
  const { data: usageData } = usage || {};

  if (!agentsData || !sitesData || !chartData || !usageData) {
    notFound();
  }

  const transformedAgents: SelectAgent[] = agentsData.map(transformToSelectAgent);
  const hasNoAgents = transformedAgents.length === 0;
  const hasSites = sitesData.length > 0;
  const userSiteId = hasSites ? sitesData[0].id : null; // Extract the first site's ID
  const recentAgents = transformedAgents.slice(0, 5);

  return (
    <div className="space-y-6">
      <Breadcrumbs pageName={pageData.name} />

      <PageWrapper>
        <div className="space-y-8">
          <div className="flex items-start justify-between gap-6">
            <Header title={pageData.title}>{pageData.description}</Header>
            {hasNoAgents && hasSites && userSiteId && (
              <CreateAgentBanner className="flex-1 max-w-2xl" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Chart
              chartData={chartData}
              className="col-span-2 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream"
            />
            <Suspense fallback={<div>Loading usage data...</div>}>
              <Usage initialTier={currentTier} chartData={chartData} />
            </Suspense>
          </div>

          <div className="space-y-8">
            <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-cal text-white">Recent Onboards</h2>
                {hasSites && transformedAgents.length > 0 && userSiteId && (
                  <Link
                    href={`/site/${userSiteId}`} // Updated href to include siteId
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    View All Onboards →
                  </Link>
                )}
              </div>
              {transformedAgents.length > 0 ? (
                <AgentsDataTable data={recentAgents} />
              ) : (
                <div className="w-full">
                  {hasSites ? (
                    <CreateAgentBanner className="w-full max-w-xl" />
                  ) : (
                    <Link
                      href="/sites"
                      className="text-dream-cyan hover:text-dream-cyan/90 transition-colors"
                    >
                      Create a site first to start creating onboards
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
