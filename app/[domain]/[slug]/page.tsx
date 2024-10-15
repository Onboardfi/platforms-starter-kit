// app/[domain]/[slug]/page.tsx

import { notFound } from "next/navigation";
import { getAgentData, getSiteData } from "@/lib/fetchers";
import BlurImage from "@/components/blur-image";
import { placeholderBlurhash, toDateString } from "@/lib/utils";
import db from "@/lib/db";
import { agents, sites } from "@/lib/schema";
import { eq } from "drizzle-orm";
import AgentConsole from "@/components/agent-console";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; slug: string };
}) {
  const domain = decodeURIComponent(params.domain);
  const slug = decodeURIComponent(params.slug);

  const [data, siteData] = await Promise.all([
    getAgentData(domain, slug),
    getSiteData(domain),
  ]);
  if (!data || !siteData) {
    return null;
  }
  const { name, description } = data;

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      creator: "@your_twitter_handle",
    },
  };
}

export async function generateStaticParams() {
  const allAgents = await db
    .select({
      slug: agents.slug,
      site: {
        subdomain: sites.subdomain,
        customDomain: sites.customDomain,
      },
    })
    .from(agents)
    .leftJoin(sites, eq(agents.siteId, sites.id))
    .where(eq(sites.subdomain, "demo")); // Adjust the filter as needed

  const allPaths = allAgents
    .flatMap(({ site, slug }) => [
      site?.subdomain && {
        domain: `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
        slug,
      },
      site?.customDomain && {
        domain: site.customDomain,
        slug,
      },
    ])
    .filter(Boolean);

  return allPaths;
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

  return (
    <>
      <div className="flex flex-col items-center justify-center">
        <div className="m-auto w-full text-center md:w-7/12">
          <p className="m-auto my-5 w-10/12 text-sm font-light text-stone-500 md:text-base dark:text-stone-400">
            {toDateString(data.createdAt)}
          </p>
          <h1 className="mb-10 font-title text-3xl font-bold text-stone-800 md:text-6xl dark:text-white">
            {data.name}
          </h1>
          <p className="text-md m-auto w-10/12 text-stone-600 md:text-lg dark:text-stone-400">
            {data.description}
          </p>
        </div>
        
      </div>


      {/* Render the Agent Console */}
      <div className="mx-auto max-w-screen-lg">
        <AgentConsole agent={data} />
      </div>

      {/* Optionally, display adjacent agents */}
      {/* {data.adjacentAgents && data.adjacentAgents.length > 0 && (
        // Display adjacent agents here
      )} */}
    </>
  );
}
