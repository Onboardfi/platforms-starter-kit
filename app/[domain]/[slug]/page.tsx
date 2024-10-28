import { notFound } from "next/navigation";
import { getAgentData } from "@/lib/fetchers";
import AgentConsole from "@/components/agent-console";
import { AgentSettings } from "@/lib/types";

interface Site {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
}

interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  userId: string | null;
  siteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
  settings: AgentSettings;
  site: Site;
}

export default async function SiteAgentPage({
  params,
}: {
  params: { domain: string; slug: string };
}) {
  const domain = decodeURIComponent(params.domain);
  const slug = decodeURIComponent(params.slug);
  const data = await getAgentData(domain, slug);

  if (!data) {
    notFound();
  }

  const agent: Agent = {
    ...data,
    site: {
      id: data.site.id,
      name: data.site.name,
      description: data.site.description,
      logo: data.site.logo,
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1">
        <AgentConsole agent={agent} />
      </div>
    </div>
  );
}
