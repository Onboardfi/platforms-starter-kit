import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Form from '@/components/form';
import DeleteAgentForm from '@/components/form/delete-agent-form';
import db from '@/lib/db';

export default async function AgentSettings({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { success?: string; error?: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const agent = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.id, decodeURIComponent(params.id)),
  });

  if (!agent || agent.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-6">
      <div className="flex flex-col space-y-6">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Agent Settings
        </h1>

        {/* Display success or error messages */}
        {searchParams.success && (
          <p className="text-green-600">Agent updated successfully!</p>
        )}
        {searchParams.error && (
          <p className="text-red-600">{decodeURIComponent(searchParams.error)}</p>
        )}

        <Form
          title="Agent Slug"
          description="The slug is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens."
          helpText="Please use a slug that is unique to this agent."
          inputAttrs={{
            name: 'slug',
            type: 'text',
            defaultValue: agent.slug || '',
            placeholder: 'slug',
          }}
          agentId={agent.id}
        />

        <Form
          title="Thumbnail Image"
          description="The thumbnail image for your agent. Accepted formats: .png, .jpg, .jpeg"
          helpText="Max file size 50MB. Recommended size 1200x630."
          inputAttrs={{
            name: 'image',
            type: 'file',
            defaultValue: agent.image || '',
          }}
          agentId={agent.id}
        />

        <DeleteAgentForm agentName={agent.name || 'Agent'} />
      </div>
    </div>
  );
}
