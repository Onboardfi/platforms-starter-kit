"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@radix-ui/react-scroll-area";

interface Integration {
  name: string;
  description: string;
  category: string;
  status: string;
  color: string;
  image: string;
}

const integrations = {
  automation: [
    {
      name: "Zapier",
      description: "Automate repetitive tasks and save valuable time.",
      category: "automation",
      status: "disconnected",
      color: "orange",
      image: "/zapier.png"
    }
  
  ],
  communication: [
    {
      name: "Slack",
      description: "Keep your team connected with real-time updates.",
      category: "communication",
      status: "disconnected",
      color: "violet",
      image: "/slack1.png"
    },
    {
      name: "Notion",
      description: "Sync docs and projects for smarter collaboration.",
      category: "communication",
      status: "connected",
      color: "cyan",
      image: "/notion1.png"
    }
  ],
  marketing: [

    {
      name: "Stripe",
      description: "Manage payments and track transactions in real time.",
      category: "marketing",
      status: "connected",
      color: "violet",
      image: "/stripe.png"
    }
  ]
};

function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <div className="group relative animate-dream-fade-up">
      <div 
        className={cn(
          "relative rounded-3xl overflow-hidden",
          "bg-neutral-900/50 backdrop-blur-md",
          "border border-white/10",
          "transition-all duration-300",
          "hover:border-white/20",
          "shadow-dream hover:shadow-dream-lg"
        )}
      >
        <div 
          className={cn(
            "absolute inset-0",
            "bg-gradient-to-br from-dream-pink/5 to-dream-cyan/5",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-300"
          )}
        />
        
        <div 
          className={cn(
            "relative p-6",
            "flex flex-col h-full",
            "shine"
          )}
        >
          <div className="flex items-start space-x-4">
            <div 
              className={cn(
                "w-16 h-16 rounded-2xl",
                "bg-neutral-800/50",
                "border border-white/10",
                "flex items-center justify-center",
                "flex-shrink-0 relative overflow-hidden",
                "group-hover:border-white/20",
                "transition-all duration-300",
                "shine shadow-dream"
              )}
            >
              <Image
                src={integration.image}
                alt={`${integration.name} logo`}
                fill
                className="object-contain p-2"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-light text-white/90">
                  {integration.name}
                </h3>
                
                {integration.status === 'connected' && (
                  <span 
                    className={cn(
                      'px-3 py-1',
                      'text-[10px] font-light',
                      'rounded-full',
                      'border backdrop-blur-md',
                      'transition-all duration-300',
                      'animate-dream-fade-up',
                      'shadow-dream-sm shine',
                      {
                        'bg-dream-blue/10 border-dream-blue/20 text-dream-blue': 
                          integration.color === 'blue',
                        'bg-dream-cyan/10 border-dream-cyan/20 text-dream-cyan': 
                          integration.color === 'cyan',
                        'bg-dream-purple/10 border-dream-purple/20 text-dream-purple': 
                          integration.color === 'violet',
                        'bg-dream-orange/10 border-dream-orange/20 text-dream-orange': 
                          integration.color === 'orange',
                        'bg-dream-pink/10 border-dream-pink/20 text-dream-pink': 
                          integration.color === 'pink'
                      }
                    )}
                  >
                    Connected
                  </span>
                )}
              </div>
              
              <p className="mt-2 text-xs font-light text-white/50 leading-relaxed">
                {integration.description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              variant={integration.status === 'connected' ? "destructive" : "outline"}
              className={cn(
                "flex-1 rounded-xl",
                "text-xs font-light h-9",
                "transition-all duration-300",
                "shine shadow-dream",
                integration.status === 'connected' 
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
            </Button>
            
            <Button
              variant="outline"
              className={cn(
                "w-20 rounded-xl",
                "text-xs font-light h-9",
                "bg-white/5 border-white/10",
                "text-white/70",
                "hover:bg-white/10 hover:border-white/20",
                "transition-all duration-300",
                "shine shadow-dream"
              )}
            >
              Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function IntegrationsTab() {
  return (
    <div className="relative h-full w-full">
      {/* Background layers for depth and atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-neutral-950/50 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent" />

      {/* Scrollable content area with padding and backdrop */}
      <ScrollArea className="relative h-[calc(100vh-6rem)] w-full rounded-3xl border border-white/[0.05] bg-neutral-900/50 backdrop-blur-md shadow-dream">
        {/* Container for content with proper padding */}
        <div className="space-y-12 p-6">
          {/* Automation & Development Section */}
          <div className="animate-dream-fade-up">
            <div className="flex items-center space-x-4 mb-6">
              <h2 className="text-lg font-light text-white">
                Automation & Development
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.automation.map((integration, index) => (
                <div
                  key={integration.name}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <IntegrationCard integration={integration} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Communication Section */}
          <div 
            className="animate-dream-fade-up" 
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center space-x-4 mb-6">
              <h2 className="text-lg font-light text-white">
                Communication & Collaboration
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.communication.map((integration, index) => (
                <div
                  key={integration.name}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <IntegrationCard integration={integration} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Marketing Section */}
          <div 
            className="animate-dream-fade-up" 
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center space-x-4 mb-6">
              <h2 className="text-lg font-light text-white">
                Marketing & Payments
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.marketing.map((integration, index) => (
                <div
                  key={integration.name}
                  style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                >
                  <IntegrationCard integration={integration} />
                </div>
              ))}
            </div>
          </div>

         
        </div>
      </ScrollArea>
    </div>
  );
}