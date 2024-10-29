import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import AgentCard from '@/components/agent-card';
import { Agent } from '@/types/agent';

interface AgentsProps {
  siteId: string;
  userId: string;
}

export default async function Agents({ siteId, userId }: AgentsProps): Promise<JSX.Element | null> {
  const agentsData: Agent[] = await db.query.agents.findMany({
    columns: {
      id: true,
      name: true,
      description: true,
      slug: true,
      published: true,
      image: true,
      imageBlurhash: true,
      createdAt: true,
      settings: true,
    },
    with: {
      site: {
        columns: {
          id: true,
          name: true,
          description: true,
          logo: true,
          subdomain: true,
          customDomain: true,
        },
      },
    },
    where: (table) => eq(table.siteId, siteId),
    orderBy: (table) => table.createdAt,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agentsData.map((agent) => (
        <AgentCard key={agent.id} data={agent} />
      ))}
    </div>
  );
}