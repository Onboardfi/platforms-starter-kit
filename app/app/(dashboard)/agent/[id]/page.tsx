import { notFound } from 'next/navigation';
import { getAgentById } from '@/lib/actions';
import AgentForm from '@/components/agent-form';

interface AgentPageProps {
  params: {
    id: string;
  };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { id } = params;
  const agent = await getAgentById(id);

  if (!agent) {
    notFound();
  }

  return (
    <div className="p-4">
      <AgentForm agent={agent} />
    </div>
  );
}
