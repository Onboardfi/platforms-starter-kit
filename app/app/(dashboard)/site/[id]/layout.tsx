// Base Layout (app/(dashboard)/site/[id]/layout.tsx)
import { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen ">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-dream-cyan/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-dream-cyan/20 blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative max-w-screen-xl mx-auto p-8 space-y-8">
        <div className="flex flex-col space-y-6">{children}</div>
      </div>
    </div>
  );
}