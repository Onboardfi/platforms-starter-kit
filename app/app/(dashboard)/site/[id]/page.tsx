import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Agents from '@/components/agents';
import SiteHeader from '@/components/site-header';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Site } from '@/types/site';

export default async function SiteAgents({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const siteId = decodeURIComponent(params.id);
  const data = await db.query.sites.findFirst({
    where: (sites) => eq(sites.id, siteId),
    columns: {
      id: true,
      name: true,
      description: true,
      logo: true,
      font: true,
      subdomain: true,
      customDomain: true,
      message404: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!data || data.createdBy !== session.user.id) {
    notFound();
  }

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
  };

  const url = process.env.NODE_ENV === 'production'
    ? `https://${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
    : `http://${site.subdomain}.localhost:3000`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SiteHeader site={site} url={url} />
      <div className="space-y-6">
        <h1 className="text-3xl font-cal">Onboards</h1>
        <Agents siteId={site.id} createdBy={session.user.id} />
      </div>
    </div>
  );
}