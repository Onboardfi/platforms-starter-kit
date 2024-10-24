import { notFound } from "next/navigation";
import { getAgentData, getSiteData } from "@/lib/fetchers";
import BlurImage from "@/components/blur-image";
import { placeholderBlurhash, toDateString } from "@/lib/utils";
import db from "@/lib/db";
import { agents, sites } from "@/lib/schema";
import { eq } from "drizzle-orm";
import AgentConsole from "@/components/agent-console";

// Keep existing generateMetadata and generateStaticParams functions...

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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Navigation with Agent Info */}
    

      {/* Main Content - Agent Console */}
      <div className="flex-1">
        <AgentConsole agent={data} />
      </div>
    </div>
  );
}