'use client';

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster 
        position="top-right" 
        toastOptions={{
          // Style toasts for dark mode by default
          className: 'dark:bg-dark-accent-2 dark:text-white',
          // Add DreamUI animation
          classNames: {
            toast: 'animate-dream-fade-up',
            title: 'font-cal',
            description: 'text-muted-foreground'
          }
        }}
      />
    </SessionProvider>
  );
}