// app/app/(dashboard)/site/[id]/page.tsx
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Agents from '@/components/agents';
import SiteHeader from '@/components/site-header';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Site } from '@/types/site';

// Update the type to include all required fields
type RequiredSite = Pick<Site, 'id' | 'name' | 'subdomain' | 'userId' | 'createdAt' | 'updatedAt'>;

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
      subdomain: true,
      userId: true,
      createdAt: true,  // Added required field
      updatedAt: true,  // Added required field
    },
  });

  if (!data || data.userId !== session.user.id) {
    notFound();
  }

  // Transform to ensure non-null values where required
  const site: RequiredSite = {
    id: data.id,
    name: data.name || '',
    subdomain: data.subdomain || '',
    userId: data.userId || '',
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
        <h1 className="text-3xl font-cal">Agents</h1>
        <Agents siteId={site.id} />
      </div>
    </div>
  );
}