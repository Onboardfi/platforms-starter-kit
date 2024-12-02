import { notFound } from "next/navigation";
import { getAgentData } from "@/lib/fetchers";
import AgentConsole from "@/components/agent-console/index";
import { AgentSettings } from "@/lib/types";

interface Site {
  id: string;
  name: string | null;
  description: string | null;
  logo: string | null;
}

interface Agent {
  id: string;
  name?: string | null;
  description?: string | null;
  slug?: string;
  userId?: string | null;
  siteId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  published?: boolean;
  settings: AgentSettings;
  site?: Site;
}

export default async function SiteAgentPage({
  params,
}: {
  params: { domain: string; slug: string };
}) {
  const domain = decodeURIComponent(params.domain);
  const slug = decodeURIComponent(params.slug);
  const data = await getAgentData(domain, slug);

  if (!data || !data.settings) {
    notFound();
  }

  // Create a properly formatted agent object
  const agent = {
    id: data.id,
    name: data.name || null,
    settings: {
      ...data.settings,
      onboardingType: data.settings.onboardingType || 'internal',
      authentication: data.settings.authentication || {
        enabled: false
      }
    },
    site: data.site ? {
      logo: data.site.logo || null
    } : undefined
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1">
        <AgentConsole agent={agent} />
      </div>
    </div>
  );
}