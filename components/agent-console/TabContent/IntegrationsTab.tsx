import React from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import MondayCard from './MondayCard';
import IntegrationCard, { Integration } from "@/components/integration-card";

// Custom interface for integrations that can be either a standard integration or a custom component
interface CustomComponent {
  name: string;
  component: React.ComponentType;
}

type IntegrationType = Integration | CustomComponent;

// Type guard to check if an integration is a custom component
function isCustomComponent(integration: IntegrationType): integration is CustomComponent {
  return 'component' in integration;
}

const integrations: Record<string, IntegrationType[]> = {
  communication: [
    {
      id: "slack",
      name: "Slack",
      description: "Keep your team connected with real-time updates.",
      category: "communication",
      status: "not_connected" as const,
      image: "/slack1.png",
      docUrl: "https://docs.example.com/slack"
    },
    {
      id: "notion",
      name: "Notion",
      description: "Sync docs and projects for smarter collaboration.",
      category: "communication",
      status: "connected" as const,
      image: "/notion1.png",
      docUrl: "https://docs.example.com/notion"
    }
  ],
  marketing: [
    {
      id: "stripe",
      name: "Stripe",
      description: "Manage payments and track transactions in real time.",
      category: "marketing",
      status: "connected" as const,
      image: "/stripe.png",
      docUrl: "https://docs.example.com/stripe"
    }
  ],
  crm: [
    {
      name: "Monday.com",
      component: MondayCard
    }
  ]
};

export function IntegrationsTab() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-neutral-950/50 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent" />

      <ScrollArea className="relative h-[calc(100vh-6rem)] w-full rounded-3xl border border-white/[0.05] bg-neutral-900/50 backdrop-blur-md shadow-dream">
        <div className="space-y-12 p-6">
          {/* CRM Section */}
          <div 
            className="animate-dream-fade-up" 
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center space-x-4 mb-6">
              <h2 className="text-lg font-light text-white">
                CRM & Lead Management
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.crm.map((integration, index) => (
                <div
                  key={isCustomComponent(integration) ? integration.name : integration.id}
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                >
                  {isCustomComponent(integration) ? (
                    <integration.component />
                  ) : (
                    <IntegrationCard data={integration} />
                  )}
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
                  key={isCustomComponent(integration) ? integration.name : integration.id}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  {isCustomComponent(integration) ? (
                    <integration.component />
                  ) : (
                    <IntegrationCard data={integration} />
                  )}
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
                  key={isCustomComponent(integration) ? integration.name : integration.id}
                  style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                >
                  {isCustomComponent(integration) ? (
                    <integration.component />
                  ) : (
                    <IntegrationCard data={integration} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}