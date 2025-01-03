/////Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/app/(dashboard)/layout.tsx

import { ReactNode } from "react";
import { SidebarProvider } from "@/components/sidebar/index";
import { DashboardLayoutContent } from "./DashboardLayoutContent";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}
