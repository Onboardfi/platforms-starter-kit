import "@/styles/globals.css";
import { cal, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "./providers";
import { Metadata } from "next";
import { cn } from "@/lib/utils";

const title = "OnboardFi – AI powered onboarding.";
const description =
  "OnboardFi provides AI-powered onboarding solutions to streamline and enhance your customer onboarding experience.";

export const metadata: Metadata = {
  title,
  description,
  icons: ["/favicon.ico"], // Updated to use local favicon
  openGraph: {
    title,
    description,
    images: ["/onboardfi-logo-q4.png"], // Optional: You can use your logo for social sharing
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/onboardfi-logo-q4.png"], // Optional: You can use your logo for social sharing
    creator: "@onboardfi", // Update this to your Twitter handle if you have one
  },
  metadataBase: new URL("https://onboardfi.com"), // Update this to your actual domain
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(cal.variable, inter.variable)}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}