// /components/agents.tsx
import { getAgentsWithSessionCount } from '@/lib/actions';
import AgentCard from '@/components/agent-card';
import { Agent } from '@/types/agent';

interface AgentsProps {
  siteId: string;
  userId: string;
}

export default async function Agents({ siteId, userId }: AgentsProps): Promise<JSX.Element | null> {
  const agentsData = await getAgentsWithSessionCount(siteId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agentsData.map((agent: Agent) => (
        <AgentCard key={agent.id} data={agent} />
      ))}
    </div>
  );
}