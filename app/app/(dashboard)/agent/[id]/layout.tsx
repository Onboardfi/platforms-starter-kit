import { ReactNode } from "react";
import AgentNav from "./nav";
import { AgentProvider } from "@/app/contexts/AgentContext";

export default function AgentLayout({ children }: { children: ReactNode }) {
  return (
    <AgentProvider>
      <div className="flex flex-col space-y-6 sm:p-10">
        <AgentNav />
        {children}
      </div>
    </AgentProvider>
  );
}
