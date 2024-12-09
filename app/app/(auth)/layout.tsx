import { Metadata } from "next";
import { ReactNode } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Mic, Paintbrush, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "OnboardFi – AI Powered Onboarding.",
};

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="bg-black/20 border-white/10">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-white/80" />
          <h4 className="text-lg font-semibold text-white">{title}</h4>
        </div>
        <p className="text-white/70 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side: Marketing Content */}
      <div className="relative w-1/2 overflow-hidden">
        {/* YouTube Background */}
      

        {/* Enhanced Overlay with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80 z-0" />

        {/* Mascot */}
        <div className="absolute bottom-0 mb-20 right-0 w-48 h-48  z-0 opacity-80">
          <Image
            src="/astro.png"
            alt="OnboardFi Mascot"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center h-full text-white p-8 overflow-auto">
          <div className="max-w-xl w-full space-y-8">
            {/* Logo & Header */}
            <div className="text-center space-y-6">
              <Image
                src="/onboardfi-logo-q4.png"
                alt="OnboardFi Logo"
                width={200}
                height={200}
                className="mx-auto"
                priority
              />
              <div className="space-y-4">
                <Badge className="bg-white/10 text-white hover:bg-white/20 transition-colors">
                  AI-Powered Onboarding Platform
                </Badge>
                <h2 className="text-4xl font-bold leading-tight">
                  No Code AI-Powered<br />Customer Onboarding
                </h2>
                <p className="text-lg text-white/80">
                  Provide High-touch White Glove Onboarding At Scale.
                </p>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Features Section */}
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Platform Features</h3>
              
              <div className="grid gap-4">
                <FeatureCard
                  icon={Mic}
                  title="Voice-to-Voice AI Agents"
                  description="Deploy intelligent AI agents that provide real-time assistance and personalized guidance throughout the onboarding journey."
                />
                <FeatureCard
                  icon={Paintbrush}
                  title="Dynamic Generative UI/UX"
                  description="Create adaptive interfaces that evolve in real-time based on user interactions and needs."
                />
                <FeatureCard
                  icon={Users}
                  title="Multi-Tenant Architecture"
                  description="Build and manage separate onboarding websites with unique domains for each of your clients."
                />
              </div>

       
            </div>
          </div>
        </div>
      </div>
      {/* Right Side: The login form (children) */}
      <div className="w-1/2 flex items-center justify-center bg-neutral-950 p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}