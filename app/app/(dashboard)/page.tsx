// app/(dashboard)/page.tsx

import { Suspense } from "react";
import { Breadcrumbs } from "@/components/parts/breadcrumbs";
import { Header } from "@/components/parts/header";
import { Chart } from "@/components/dashboard/chart";
import { PageWrapper } from "@/components/parts/page-wrapper";
import { getAgentAndSiteCounts } from "@/lib/data/dashboard"; // Updated import
import { notFound } from "next/navigation";
import { getAgents } from "@/lib/data/agents";
import { getSites } from "@/lib/data/sites"; // Import getSites function
import { getUsageForUser } from "@/lib/data/users";
import { Usage } from "@/components/parts/usage";
import { AgentsDataTable } from "@/components/groups/agents/data-table";
import { SitesDataTable } from "@/components/groups/sites/data-table"; // Import SitesDataTable component
import Link from "next/link";
import { SelectAgent, SelectSite } from "@/lib/schema"; // Import SelectSite type

const pageData = {
  name: "Dashboard",
  title: "Dashboard",
  description: "Snapshot of your agents and sites usage",
};

export default async function Page() {
  // Fetch chart data
  const charts = await getAgentAndSiteCounts();
  const { data: chartData } = charts || {};

  // Fetch agents
  const agents = await getAgents();
  const { data: agentsData } = agents || {};

  // Fetch sites
  const sites = await getSites(); // Fetch sites data
  const { data: sitesData } = sites || {};

  // Fetch usage data
  const usage = await getUsageForUser();
  const { data: usageData } = usage || {};

  // Check for errors
  if (
    !agentsData ||
    !sitesData ||
    !chartData ||
    usageData === null ||
    usageData === undefined
  ) {
    notFound();
  }

  // Get the 5 most recent agents
  const recentAgents: SelectAgent[] = agentsData.slice(0, 5);

  // Get the 5 most recent sites
  const recentSites: SelectSite[] = sitesData.slice(0, 5);

  return (
    <>
      <Breadcrumbs pageName={pageData.name} />
      <PageWrapper>
        <Header title={pageData.title}>{pageData.description}</Header>
        <div className="grid grid-cols-3 gap-4">
          <Chart chartData={chartData} className="col-span-2" />
          <Usage totalUsage={100} used={usageData} plan="Pro" />
        </div>
      </PageWrapper>

      {/* Full-width Links Section */}
      <div className="w-full px-4 sm:px-8 mt-8">
        <Links />
      </div>

      <PageWrapper>
        <div className="mt-8">
          <h2 className="text-lg mb-4">Recent Agents</h2>
          <AgentsDataTable data={recentAgents} />
          <h2 className="text-lg mb-4 mt-8">Recent Sites</h2>
          <SitesDataTable data={recentSites} />
        </div>
      </PageWrapper>
    </>
  );
}

const navLinks = [
  {
    name: "Agents",
    description: "Create and manage your agents",
    href: "/agents",
  },
  {
    name: "Sites",
    description: "Create and manage your sites",
    href: "/sites",
  },
  {
    name: "Integrations",
    description: "Create and manage your sites",
    href: "/integrations",
  },
  // Add other relevant links
];

const Links = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 mb-2 gap-4">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="bg-background p-6 rounded-lg border hover:bg-accent/75 transition-all"
        >
          <div>
            <h3 className="text-lg font-medium">{link.name}</h3>
            <p className="text-sm text-gray-500">{link.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};