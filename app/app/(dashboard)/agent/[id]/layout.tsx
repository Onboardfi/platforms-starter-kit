import { ReactNode } from 'react';
import AgentNav from './nav';

export default function AgentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col space-y-6 sm:p-10">
      <AgentNav />
      {children}
    </div>
  );
}
