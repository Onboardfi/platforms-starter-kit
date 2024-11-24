
///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/layout.tsx

import "@/styles/globals.css";
import { cal, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "./providers";
import { Metadata } from "next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const title = "OnboardFi – AI powered onboarding.";
const description =
  "OnboardFi provides AI-powered onboarding solutions to streamline and enhance your customer onboarding experience.";

export const metadata: Metadata = {
  title,
  description,
  icons: ["/favicon.ico"],
  openGraph: {
    title,
    description,
    images: ["/onboardfi-logo-q4.png"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/onboardfi-logo-q4.png"],
    creator: "@onboardfi",
  },
  metadataBase: new URL("https://onboardfi.com"),
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" }
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body 
        className={cn(
          cal.variable, 
          inter.variable,
          "min-h-screen bg-background font-default antialiased",
          "selection:bg-dream-blue/10 selection:text-dream-blue",
          "dark:selection:bg-dream-blue/20 dark:selection:text-dream-blue"
        )}
      >
        <ThemeProvider
          defaultTheme="dark"
          enableSystem={false}
          storageKey="onboard-ui-theme"
          disableTransitionOnChange={false}
        >
          <Providers>
            <main className="flex min-h-screen flex-col">
              {children}
            </main>
            <Analytics />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}