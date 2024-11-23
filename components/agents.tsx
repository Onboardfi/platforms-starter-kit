import { getAgentsWithSessionCount } from '@/lib/actions';
import AgentCard from '@/components/agent-card';
import { Agent, Site } from '@/types/agent';
import { SelectAgent } from '@/lib/schema';

interface AgentsProps {
  siteId: string;
  createdBy: string;
}

function convertToAgent(selectAgent: SelectAgent): Agent {
  const site: Site | null = selectAgent.site ? {
    id: selectAgent.site.id,
    name: selectAgent.site.name,
    description: selectAgent.site.description,
    logo: selectAgent.site.logo,
    subdomain: selectAgent.site.subdomain,
    customDomain: selectAgent.site.customDomain
  } : null;

  return {
    id: selectAgent.id,
    name: selectAgent.name,
    description: selectAgent.description || null,
    slug: selectAgent.slug,
    published: selectAgent.published,
    image: selectAgent.image,
    imageBlurhash: selectAgent.imageBlurhash,
    createdAt: selectAgent.createdAt,
    site: site,
    settings: selectAgent.settings,
    _count: selectAgent._count
  };
}

export default async function Agents({ siteId, createdBy }: AgentsProps): Promise<JSX.Element | null> {
  const selectAgents = await getAgentsWithSessionCount(siteId, createdBy);
  const agentsData = selectAgents.map(convertToAgent);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agentsData.map((agent: Agent) => (
        <AgentCard key={agent.id} data={agent} />
      ))}
    </div>
  );
}