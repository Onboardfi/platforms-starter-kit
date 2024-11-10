// Settings Layout (app/(dashboard)/site/[id]/settings/layout.tsx)
import { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import SiteSettingsNav from "./nav";
import { ExternalLink } from "lucide-react";
import db from "@/lib/db";

export default async function SiteSettingsLayout({
  params,
  children,
}: {
  params: { id: string };
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const data = await db.query.sites.findFirst({
    where: (sites, { eq }) => eq(sites.id, decodeURIComponent(params.id)),
  });

  if (!data || data.userId !== session.user.id) {
    notFound();
  }

  const url = `${data.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          {/* Gradient Overlay to Fade Grid */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        {/* Gradient Border Effect */}
        <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />
        
        <div className="relative p-8 z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-3xl font-light text-white">
              Settings for {data.name}
            </h1>
            <a
              href={
                process.env.NEXT_PUBLIC_VERCEL_ENV
                  ? `https://${url}`
                  : `http://${data.subdomain}.localhost:3000`
              }
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900/50 text-neutral-300 hover:text-white transition-colors duration-300 group"
            >
              <span className="text-sm">{url}</span>
              <ExternalLink className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
          
          <div className="mt-8">
            <SiteSettingsNav />
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        {/* Gradient Border Effect */}
        <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />
        
        <div className="relative p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
