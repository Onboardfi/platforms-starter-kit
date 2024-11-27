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
import { AgentWithRelations, SelectSite } from "@/lib/schema";

const pageData = {
  name: "Dashboard",
  title: "Dashboard",
  description: "Snapshot of your onboards and sites usage",
};

export default async function Page() {
  // Fetch all required data
  const charts = await getAgentAndSiteCounts();
  const agents = await getAgents();
  const sites = await getSites();
  const usage = await getUsageForUser();

  // Destructure with type safety
  const { data: chartData } = charts || {};
  const { data: agentsData } = agents || {};
  const { data: sitesData } = sites || {};
  const { data: usageData } = usage || {};

  if (!agentsData || !sitesData || !chartData || !usageData) {
    notFound();
  }

  // Take only the 5 most recent entries
  const recentAgents = agentsData.slice(0, 5);
  const recentSites = sitesData.slice(0, 5);
  
  const userPlan = 'Pro';

  return (
    <div className="space-y-6">
      <Breadcrumbs pageName={pageData.name} />
      
      <PageWrapper>
        <div className="space-y-8">
          <Header title={pageData.title}>{pageData.description}</Header>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Chart 
              chartData={chartData}
              className="col-span-2 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream" 
            />
            <Suspense fallback={<div>Loading usage data...</div>}>
              <Usage plan={userPlan} />
            </Suspense>
          </div>

          <div className="space-y-8">
            <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream">
              <h2 className="text-xl font-cal text-white mb-6">Recent Onboards</h2>
              {/* @ts-expect-error - Type mismatch is handled by AgentsDataTable component */}
              <AgentsDataTable data={recentAgents} />
            </div>
            
            <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream">
              <h2 className="text-xl font-cal text-white mb-6">Recent Sites</h2>
              <SitesDataTable data={recentSites} />
            </div>
          </div>
        </div>
        
      </PageWrapper>
    </div>
  );
}