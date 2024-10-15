// app/app/(dashboard)/site/[id]/page.tsx

import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Agents from '@/components/agents';
import CreateAgentButton from '@/components/create-agent-button';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Site } from '@/types/site';

export default async function SiteAgents({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const siteId = decodeURIComponent(params.id);

  const site: Site | null = await db.query.sites.findFirst({
    where: (sites) => eq(sites.id, siteId),
    columns: {
      id: true,
      name: true,
      subdomain: true,
      userId: true,
    },
  });

  if (!site || site.userId !== session.user.id) {
    notFound();
  }

  const url = process.env.NODE_ENV === 'production'
    ? `https://${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
    : `http://${site.subdomain}.localhost:3000`;

  return (
    <>
      <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
        <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0">
          <h1 className="w-60 truncate font-cal text-xl font-bold sm:w-auto sm:text-3xl dark:text-white">
            All Agents for {site.name}
          </h1>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="truncate rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            {url} ↗
          </a>
        </div>
        <CreateAgentButton siteId={site.id} />
      </div>
      <Agents siteId={site.id} />
    </>
  );
}
