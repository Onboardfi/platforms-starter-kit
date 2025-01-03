// app/app/(dashboard)/agent/[id]/tab2/page.tsx
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { getAgentById } from '@/lib/actions';
import ClientAgentStepsWrapper from '@/components/ClientAgentStepsWrapper';

export default async function Tab2Page({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const agent = await getAgentById(decodeURIComponent(params.id));

  if (!agent || agent.createdBy !== session.user.id) {
    notFound();
  }

  return (
    <div className="p-4">
      <ClientAgentStepsWrapper
        existingSteps={agent.settings?.steps || []}
        tools={agent.settings?.tools || []}
      />
    </div>
  );
}