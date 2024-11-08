// app/(dashboard)/layout.tsx

import { ReactNode, Suspense } from "react";
import { SidebarProvider, Sidebar, SidebarContent } from "@/components/sidebar/index";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="relative min-h-screen">
        <Sidebar>
          <SidebarContent />
        </Sidebar>
        <main className={`
          min-h-screen 
          transition-all 
          duration-300 
          md:pl-[280px]  // Width when sidebar is expanded
          dark:bg-black
          px-4 
          md:px-8
          py-4 
          md:py-6
        `}>
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}