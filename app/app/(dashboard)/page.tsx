// app/(dashboard)/page.tsx

import { Suspense } from "react";
import { Breadcrumbs } from "@/components/parts/breadcrumbs";
import { Header } from "@/components/parts/header";
import { Chart } from "@/components/dashboard/chart";
import { PageWrapper } from "@/components/parts/page-wrapper";
import { getAgentAndSiteCounts } from "@/lib/data/dashboard";
import { notFound } from "next/navigation";
import { getAgents } from "@/lib/data/agents";
import { getSites } from "@/lib/data/sites";
import { getUsageForUser } from "@/lib/data/users";
import { Usage } from "@/components/parts/usage";
import { AgentsDataTable } from "@/components/groups/agents/data-table";
import { SitesDataTable } from "@/components/groups/sites/data-table";
import { SelectAgent, SelectSite } from "@/lib/schema";
import { Links } from "@/components/parts/links";
import WebSocketClient from '@/components/WebSocketClient';

const pageData = {
  name: "Dashboard",
  title: "Dashboard",
  description: "Snapshot of your onboards and sites usage",
};

export default async function Page() {
  // Fetch chart data
  const charts = await getAgentAndSiteCounts();
  const { data: chartData } = charts || {};

  // Fetch agents
  const agents = await getAgents();
  const { data: agentsData } = agents || {};

  // Fetch sites
  const sites = await getSites();
  const { data: sitesData } = sites || {};

  // Fetch usage data
  const usage = await getUsageForUser();
  const { data: usageData } = usage || {};

  // Check for errors
  if (
    !agentsData ||
    !sitesData ||
    !chartData ||
    !usageData
  ) {
    notFound();
  }

  // Get the 5 most recent agents
  const recentAgents: SelectAgent[] = agentsData.slice(0, 5);

  // Get the 5 most recent sites
  const recentSites: SelectSite[] = sitesData.slice(0, 5);

  // Define usage limits based on plan (adjust these as needed)
  const USAGE_LIMITS = {
    Free: 1000,
    Pro: 10000,
    Enterprise: 100000
  };

  // Determine user's plan (you might want to get this from your user data)
  const userPlan = 'Pro'; // This should come from your user data
  const usageLimit = USAGE_LIMITS[userPlan];

  return (
    <div className="space-y-6">
      <Breadcrumbs pageName={pageData.name} />
      
      <PageWrapper>
        <div className="space-y-8">
          <Header title={pageData.title}>{pageData.description}</Header>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Chart 
              chartData={chartData}
              className="col-span-2 rounded-xl border border-white/[0.02] 
                bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream" 
            />
            <Suspense fallback={<div>Loading usage data...</div>}>
            <Usage 
  plan={userPlan}
  limit={usageLimit}

/>
            </Suspense>
          </div>

          {/* Quick Links */}
          <div className="py-6">
            <Links />
          </div>
          
          {/* Data Tables */}
          <div className="space-y-8">
            <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 
              backdrop-blur-md p-6 shine shadow-dream">
              <h2 className="text-xl font-cal text-white mb-6">Recent Onboards</h2>
              <AgentsDataTable data={recentAgents} />
              <WebSocketClient />
            </div>
            
            
            <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 
              backdrop-blur-md p-6 shine shadow-dream">
              <h2 className="text-xl font-cal text-white mb-6">Recent Sites</h2>
              <SitesDataTable data={recentSites} />
            </div>
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}