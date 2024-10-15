// components/agents.tsx

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { eq } from 'drizzle-orm';
import AgentCard from '@/components/agent-card';
import { Agent } from '@/types/agent';

interface AgentsProps {
  siteId: string;
}

export default async function Agents({ siteId }: AgentsProps): Promise<JSX.Element | null> {
  const session = await getSession();
  if (!session) {
    // Handle unauthenticated users, e.g., redirect or display a message
    return null;
  }

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
      // Include other necessary fields
    },
    with: {
      site: {
        columns: {
          subdomain: true,
        },
      },
    },
    where: (table) => eq(table.siteId, siteId),
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {agentsData.map((agent) => (
        <AgentCard key={agent.id} data={agent} />
      ))}
    </div>
  );
}
