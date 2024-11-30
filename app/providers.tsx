'use client';

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ModalProvider } from "@/components/modal/provider";
import { SWRConfig } from 'swr';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig 
        value={{
          fetcher: (url: string) => fetch(url).then(res => res.json()),
          revalidateOnFocus: false,
          revalidateOnReconnect: false
        }}
      >
        <ModalProvider>{children}</ModalProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{
            className: 'dark:bg-dark-accent-2 dark:text-white',
            classNames: {
              toast: 'animate-dream-fade-up',
              title: 'font-cal',
              description: 'text-muted-foreground'
            }
          }}
        />
      </SWRConfig>
    </SessionProvider>
  );
}