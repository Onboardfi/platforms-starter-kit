// app/(dashboard)/site/[id]/page.tsx

import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { EmptyAgentState } from '@/components/empty-agent-state';
import Agents from '@/components/agents';
import SiteHeader from '@/components/site-header';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { sites, agents as agentsTable } from '@/lib/schema';
import { Site } from '@/types/site';

export default async function SiteAgents({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organizationId) {
    redirect('/login');
  }

  const siteId = decodeURIComponent(params.id);
  
  // Get site data
  const data = await db.query.sites.findFirst({
    where: eq(sites.id, siteId),
    with: {
      organization: true,
      creator: true,
    },
  });

  if (!data) {
    notFound();
  }

  if (data.organizationId !== session.organizationId) {
    console.error(
      `Access denied: User org ${session.organizationId} attempting to access site from org ${data.organizationId}`
    );
    notFound();
  }

  // Get agents count for this site
  const agentsCount = await db.select({ count: agentsTable.id })
    .from(agentsTable)
    .where(eq(agentsTable.siteId, siteId))
    .execute()
    .then(result => result.length);

  const site: Site = {
    id: data.id,
    name: data.name,
    description: data.description,
    logo: data.logo,
    font: data.font || 'font-cal',
    subdomain: data.subdomain,
    customDomain: data.customDomain,
    message404: data.message404,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    organizationId: data.organizationId,
    organization: data.organization,
    creator: data.creator,
  };

  const url = process.env.NODE_ENV === 'production'
    ? `https://${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
    : `http://${site.subdomain}.localhost:3000`;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <SiteHeader site={site} url={url} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-cal text-white">Onboards</h1>
        </div>
        {agentsCount === 0 ? (
          <EmptyAgentState siteId={site.id} organizationId={site.organizationId} />
        ) : (
          <Agents siteId={site.id} organizationId={site.organizationId} />
        )}
      </div>
    </div>
  );
}