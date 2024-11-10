// app/sites/page.tsx
import { Suspense } from "react";
import Sites from "@/components/sites";
import PlaceholderCard from "@/components/placeholder-card";
import CreateSiteButton from "@/components/create-site-button";
import CreateSiteModal from "@/components/modal/create-site";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sites | Platform",
  description: "Manage your sites",
};

export default function AllSites({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8 space-y-8">
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
        
        <div className="relative flex items-center justify-between p-6 z-10">
          <h1 className="font-cal text-3xl text-white text-glow">Sites</h1>
          <CreateSiteButton>
            <CreateSiteModal />
          </CreateSiteButton>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <PlaceholderCard key={i} />
            ))}
          </div>
        }
      >
        {/* @ts-expect-error Server Component */}
        <Sites siteId={decodeURIComponent(params.id)} />
      </Suspense>
    </div>
  );
}
