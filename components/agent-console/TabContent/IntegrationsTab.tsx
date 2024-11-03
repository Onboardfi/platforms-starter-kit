import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Integration {
  name: string;
  description: string;
  category: string;
  status: string;
  color: string;
}

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

function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <div className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
      <div className="bg-black rounded-lg p-4 h-full flex flex-col">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 relative overflow-hidden">
            <Image
              src={`/${integration.name}.png`}
              alt={`${integration.name} logo`}
              fill
              className="object-cover p-2"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white truncate">{integration.name}</h3>
              {integration.status === 'connected' && (
                <span className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  {
                    'bg-vercel-blue text-white': integration.color === 'blue',
                    'bg-vercel-cyan text-white': integration.color === 'cyan',
                    'bg-vercel-violet text-white': integration.color === 'violet',
                    'bg-vercel-orange text-white': integration.color === 'orange',
                    'bg-vercel-pink text-white': integration.color === 'pink'
                  }
                )}>
                  Connected
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">{integration.description}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant={integration.status === 'connected' ? "destructive" : "outline"}
            size="sm"
            className="flex-1 text-xs h-8"
          >
            {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 w-20"
          >
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

export function IntegrationsTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">CRM Systems</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.crm.map((integration) => (
            <IntegrationCard key={integration.name} integration={integration} />
          ))}
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Communication Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.communication.map((integration) => (
            <IntegrationCard key={integration.name} integration={integration} />
          ))}
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Productivity Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.productivity.map((integration) => (
            <IntegrationCard key={integration.name} integration={integration} />
          ))}
        </div>
      </div>
    </div>
  );
}