// app/app/(dashboard)/agent/[id]/page.tsx

import { notFound } from 'next/navigation';
import { getAgentById } from '@/lib/actions';
import AgentConsole from '@/components/agent-console';
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
      {/* You can choose to render either the AgentConsole or AgentForm */}

      {/* Uncomment the line below if you want to use the AgentForm */}
  <AgentForm agent={agent} />
    </div>
  );
}
