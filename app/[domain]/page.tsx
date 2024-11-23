// app/[domain]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import BlurImage from "@/components/blur-image";
import { placeholderBlurhash, toDateString } from "@/lib/utils";
import AgentCard from "@/components/agent-card";
import { getAgentsForSite, getSiteData } from "@/lib/fetchers";
import Image from "next/image";
import db from "@/lib/db";

export async function generateStaticParams() {
  const allSites = await db.query.sites.findMany({
    where: (sites, { eq }) => eq(sites.subdomain, "demo"),
    columns: {
      subdomain: true,
      customDomain: true,
    },
  });

  const allPaths = allSites
    .flatMap(({ subdomain, customDomain }) => [
      subdomain && {
        domain: `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
      },
      customDomain && {
        domain: customDomain,
      },
    ])
    .filter(Boolean);

  return allPaths;
}

export default async function SiteHomePage({
  params,
}: {
  params: { domain: string };
}) {
  const domain = decodeURIComponent(params.domain);
  const [data, agents] = await Promise.all([
    getSiteData(domain),
    getAgentsForSite(domain),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <>
      <div className="mb-20 w-full">
        {agents.length > 0 ? (
          <div className="mx-auto w-full max-w-screen-xl md:mb-28 lg:w-5/6">
            <Link href={`/${agents[0].slug}`}>
              <div className="group relative mx-auto h-80 w-full overflow-hidden sm:h-150 lg:rounded-xl">
                <BlurImage
                  alt={agents[0].name ?? ""}
                  blurDataURL={
                    agents[0].imageBlurhash ?? placeholderBlurhash
                  }
                  className="h-full w-full object-cover group-hover:scale-105 group-hover:duration-300"
                  width={1300}
                  height={630}
                  placeholder="blur"
                  src={agents[0].image ?? "/placeholder.png"}
                />
              </div>
              <div className="mx-auto mt-10 w-5/6 lg:w-full">
                <h2 className="my-10 font-title text-4xl md:text-6xl dark:text-white">
                  {agents[0].name}
                </h2>
                <p className="w-full text-base md:text-lg lg:w-2/3 dark:text-white">
                  {agents[0].description}
                </p>
                <div className="flex w-full items-center justify-start space-x-4">
                  <div className="relative h-8 w-8 flex-none overflow-hidden rounded-full">
                    {data.creator?.image ? (
                      <BlurImage
                        alt={data.creator?.name ?? "User Avatar"}
                        width={100}
                        height={100}
                        className="h-full w-full object-cover"
                        src={data.creator?.image}
                      />
                    ) : (
                      <div className="absolute flex h-full w-full select-none items-center justify-center bg-stone-100 text-4xl text-stone-500">
                        ?
                      </div>
                    )}
                  </div>
                  <p className="ml-3 inline-block whitespace-nowrap align-middle text-sm font-semibold md:text-base dark:text-white">
                    {data.creator?.name}
                  </p>
                  <div className="h-6 border-l border-stone-600 dark:border-stone-400" />
                  <p className="m-auto my-5 w-10/12 text-sm font-light text-stone-500 md:text-base dark:text-stone-400">
                    {toDateString(agents[0].createdAt)}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Image
              alt="missing agent"
              src="https://illustrations.popsy.co/gray/success.svg"
              width={400}
              height={400}
              className="dark:hidden"
            />
            <Image
              alt="missing agent"
              src="https://illustrations.popsy.co/white/success.svg"
              width={400}
              height={400}
              className="hidden dark:block"
            />
            <p className="font-title text-2xl text-stone-600 dark:text-stone-400">
              No agents yet.
            </p>
          </div>
        )}
      </div>

      {agents.length > 1 && (
        <div className="mx-5 mb-20 max-w-screen-xl lg:mx-24 2xl:mx-auto">
          <h2 className="mb-10 font-title text-4xl md:text-5xl dark:text-white">
            More Agents
          </h2>
          <div className="grid w-full grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
            {agents.slice(1).map((agent: any, index: number) => (
              <AgentCard key={index} data={agent} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
