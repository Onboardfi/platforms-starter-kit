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
    <div className="container mx-auto p-6 space-y-8">
      <div className="h-[67.63px] bg-muted/50 rounded-lg border flex items-center justify-between p-6">
        <h1 className="font-cal text-3xl">Sites</h1>
        <CreateSiteButton>
          <CreateSiteModal />
        </CreateSiteButton>
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