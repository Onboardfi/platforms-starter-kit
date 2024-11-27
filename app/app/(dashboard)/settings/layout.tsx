// app/(dashboard)/settings/layout.tsx
import { ReactNode } from "react";

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsNav from "./nav";
export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.organizationId) {
    redirect("/login");
  }

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-8 animate-dream-fade-in">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        {/* Gradient Border Effect */}
        <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />
        
        <div className="relative p-8 z-10">
          <h1 className="font-cal text-3xl font-bold text-glow mb-8">
            Settings
          </h1>
          <SettingsNav />
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