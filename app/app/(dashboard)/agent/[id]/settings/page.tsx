//Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/app/(dashboard)/agent/[id]/settings/page.tsx

import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Form from '@/components/form';
import DeleteAgentForm from '@/components/form/delete-agent-form';
import { updateAgentMetadata } from '@/lib/actions'; // Add this import
import db from '@/lib/db';

export default async function AgentSettings({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const data = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.id, decodeURIComponent(params.id)),
    with: {
      site: true,
    },
  });

  if (!data || data.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-6">
      <div className="flex flex-col space-y-6">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Agent Settings
        </h1>

        <Form
          title="Agent Slug"
          description="The slug is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens."
          helpText="Please use a slug that is unique to this agent."
          inputAttrs={{
            name: "slug",
            type: "text",
            defaultValue: data?.slug || "",
            placeholder: "slug",
          }}
          handleSubmit={updateAgentMetadata}
        />

<Form
  title="Thumbnail Image"
  description="The thumbnail image for your agent. Accepted formats: .png, .jpg, .jpeg"
  helpText="Max file size 50MB. Recommended size 1200x630."
  inputAttrs={{
    name: "image",
    type: "file",
    defaultValue: data?.image || "",
  }}
  handleSubmit={updateAgentMetadata}
/>

        <DeleteAgentForm agentName={data?.name || 'Agent'} />
      </div>
    </div>
  );
}