import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Interfaces
interface Integration {
  name: string;
  description: string;
  category: string;
  status: string;
  color: string;
}

// Integration Data
const integrations = {
  crm: [
    {
      name: "Salesforce",
      description: "Connect with Salesforce to sync customer data, opportunities, and accounts.",
      category: "crm",
      status: "disconnected",
      color: "blue"
    },
    {
      name: "HubSpot",
      description: "Integrate with HubSpot CRM for seamless contact and deal management.",
      category: "crm",
      status: "disconnected",
      color: "blue"
    },
    {
      name: "Pipedrive",
      description: "Sync your sales pipeline and contact data with Pipedrive CRM.",
      category: "crm",
      status: "disconnected",
      color: "blue"
    }
  ],
  communication: [
    {
      name: "Slack",
      description: "Send notifications and updates directly to your Slack channels.",
      category: "communication",
      status: "disconnected",
      color: "violet"
    },
    {
      name: "Gmail",
      description: "Integrate your email communications and manage draft emails.",
      category: "communication",
      status: "connected",
      color: "orange"
    }
  ],
  productivity: [
    {
      name: "Notion",
      description: "Sync notes and documentation directly with your Notion workspace.",
      category: "productivity",
      status: "connected",
      color: "cyan"
    },
    {
      name: "Trello",
      description: "Manage tasks and projects with Trello integration.",
      category: "productivity",
      status: "disconnected",
      color: "blue"
    },
    {
      name: "Asana",
      description: "Connect with Asana for project and task management.",
      category: "productivity",
      status: "disconnected",
      color: "pink"
    }
  ]
};

// Integration Card Component
function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <div className="group relative animate-dream-fade-up">
      {/* Main Card Container */}
      <div 
        className={cn(
          // Base styles
          "relative rounded-3xl overflow-hidden",
          "bg-neutral-900/50 backdrop-blur-md",
          "border border-white/10",
          "transition-all duration-300",
          // Hover effects
          "hover:border-white/20",
          "shadow-dream hover:shadow-dream-lg"
        )}
      >
        {/* Gradient Background Effect */}
        <div 
          className={cn(
            "absolute inset-0",
            "bg-gradient-to-br from-dream-pink/5 to-dream-cyan/5",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-300"
          )}
        />
        
        {/* Card Content Container */}
        <div 
          className={cn(
            "relative p-6",
            "flex flex-col h-full",
            "shine"
          )}
        >
          {/* Logo and Text Section */}
          <div className="flex items-start space-x-4">
            {/* Logo Container */}
            <div 
              className={cn(
                // Base styles
                "w-16 h-16 rounded-2xl",
                "bg-neutral-800/50",
                "border border-white/10",
                "flex items-center justify-center",
                "flex-shrink-0 relative overflow-hidden",
                // Effects
                "group-hover:border-white/20",
                "transition-all duration-300",
                "shine shadow-dream"
              )}
            >
              <Image
                src={`/${integration.name}.png`}
                alt={`${integration.name} logo`}
                fill
                className="object-cover p-2"
              />
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {/* Integration Name */}
                <h3 className="text-sm font-light text-white/90">
                  {integration.name}
                </h3>
                
                {/* Connected Status Badge */}
                {integration.status === 'connected' && (
                  <span 
                    className={cn(
                      // Base styles
                      'px-3 py-1',
                      'text-[10px] font-light',
                      'rounded-full',
                      'border backdrop-blur-md',
                      'transition-all duration-300',
                      'animate-dream-fade-up',
                      'shadow-dream-sm shine',
                      // Color variations
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
              
              {/* Description */}
              <p className="mt-2 text-xs font-light text-white/50 leading-relaxed">
                {integration.description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-2">
            {/* Connect/Disconnect Button */}
            <Button
              variant={integration.status === 'connected' ? "destructive" : "outline"}
              className={cn(
                // Base styles
                "flex-1 rounded-xl",
                "text-xs font-light h-9",
                "transition-all duration-300",
                "shine shadow-dream",
                // Status-based styles
                integration.status === 'connected' 
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
            </Button>
            
            {/* Settings Button */}
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

// Main Integrations Tab Component
export function IntegrationsTab() {
  return (
    <div className="space-y-12 p-6">
      {/* CRM Section */}
      <div className="animate-dream-fade-up">
        {/* Section Header */}
        <div className="flex items-center space-x-4 mb-6">
          <h2 className="text-lg font-light text-white">
            CRM Systems
          </h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
        </div>
        
        {/* CRM Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.crm.map((integration, index) => (
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
        {/* Section Header */}
        <div className="flex items-center space-x-4 mb-6">
          <h2 className="text-lg font-light text-white">
            Communication Tools
          </h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
        </div>
        
        {/* Communication Cards Grid */}
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
      
      {/* Productivity Section */}
      <div 
        className="animate-dream-fade-up" 
        style={{ animationDelay: "0.4s" }}
      >
        {/* Section Header */}
        <div className="flex items-center space-x-4 mb-6">
          <h2 className="text-lg font-light text-white">
            Productivity Tools
          </h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
        </div>
        
        {/* Productivity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.productivity.map((integration, index) => (
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
  );
}