// app/integrations/page.tsx
'use client';

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Grid, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MondayIntegration } from "@/components/integrations/MondayIntegration";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  status: "connected" | "not_connected";
  docUrl: string;
}

interface IntegrationCategory {
  category: string;
  integrations: Integration[];
}

interface DialogState {
  isOpen: boolean;
  integration: Integration | null;
}

const INTEGRATIONS: IntegrationCategory[] = [
  {
    category: "Automation & Development",
    integrations: [
      {
        id: "zapier",
        name: "Zapier",
        description: "Automate repetitive tasks and save valuable time.",
        category: "Automation",
        image: "/zapier.png",
        status: "not_connected",
        docUrl: "/docs/integrations/zapier",
      },
      {
        id: "github",
        name: "GitHub",
        description: "Sync code and collaborate with your team seamlessly.",
        category: "Development",
        image: "/github.png",
        status: "not_connected",
        docUrl: "/docs/integrations/github",
      },
    ],
  },
  // ... keep other categories the same ...
  {
    category: "Productivity & Scheduling",
    integrations: [
      {
        id: "cal",
        name: "Cal.com",
        description: "Open-source scheduling platform with customizable booking pages, calendar integrations, and flexible workflows.",
        category: "Scheduling",
        image: "/cal.png",
        status: "not_connected",
        docUrl: "/docs/integrations/cal",
      },
      {
        id: "monday",
        name: "monday.com CRM",
        description: "Customizable CRM to streamline sales and enhance customer relationships.",
        category: "Productivity",
        image: "/monday.png",
        status: "not_connected",
        docUrl: "/docs/integrations/monday",
      },
    ],
  },
];

const CategoryHeader = ({ title }: { title: string }) => (
  <div className="relative overflow-hidden rounded-2xl bg-neutral-900/30 backdrop-blur-md p-4 mb-6">
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/50" />
    </div>
    <div className="relative flex items-center gap-3 z-10">
      <Grid className="h-5 w-5 text-dream-cyan" />
      <h2 className="text-xl font-light text-white">{title}</h2>
    </div>
  </div>
);

const DreamIntegrationCard = ({ 
  data, 
  onConfigure 
}: { 
  data: Integration;
  onConfigure: (integration: Integration) => void;
}) => (
  <div className="group relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
    {data.id !== 'monday' && (
      <div className="absolute top-3 right-3 z-20 bg-dream-cyan/20 text-dream-cyan text-xs font-medium px-2 py-1 rounded-full border border-dream-cyan/30">
        Coming Soon
      </div>
    )}

    <div className="
      absolute inset-[0] 
      rounded-[inherit] 
      [border:1px_solid_transparent] 
      ![mask-clip:padding-box,border-box] 
      ![mask-composite:intersect] 
      [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] 
      after:absolute 
      after:aspect-square 
      after:w-[320px] 
      after:animate-border-beam 
      after:[animation-delay:0s] 
      after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] 
      after:[offset-anchor:90%_50%] 
      after:[offset-path:rect(0_auto_auto_0_round_200px)]
    " />

    <div className="relative p-6 h-full flex flex-col">
      <div className="mb-4 w-12 h-12 rounded-xl bg-neutral-900/50 border border-white/[0.08] shine overflow-hidden relative">
        <Image
          src={data.image}
          alt={`${data.name} logo`}
          fill
          className="object-contain p-2"
        />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{data.name}</h3>
      <p className="text-sm text-neutral-400 mb-6 flex-grow">
        {data.description}
      </p>
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.08]">
        <span className={`
          px-3 py-1 
          rounded-full 
          text-xs 
          ${data.status === 'connected' 
            ? 'bg-dream-cyan/20 text-dream-cyan border border-dream-cyan/20' 
            : 'bg-neutral-900/50 text-neutral-400 border border-white/[0.08]'
          }
        `}>
          {data.status === 'connected' ? 'Connected' : 'Not Connected'}
        </span>

        {data.id === 'monday' ? (
          <Button
            onClick={() => onConfigure(data)}
            className="text-sm text-dream-cyan hover:text-dream-cyan/90 transition-colors duration-300"
            variant="ghost"
          >
            Configure
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <a 
            href={data.docUrl} 
            className="
              flex items-center gap-2 
              text-sm text-neutral-400 
              hover:text-white 
              transition-colors duration-300
              group/link
            "
          >
            Learn More
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </a>
        )}
      </div>
    </div>
  </div>
);

export default function IntegrationsPage() {
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, boolean>>({});
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    integration: null
  });

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await fetch('/api/integrations/monday/status');
        const data = await response.json();
        
        setIntegrationStatuses(prev => ({
          ...prev,
          monday: data.connected
        }));
      } catch (error) {
        console.error('Failed to fetch integration statuses:', error);
      }
    };

    fetchStatuses();
  }, []);

  // Handle integration configuration
  const handleConfigure = (integration: Integration) => {
    setDialogState({
      isOpen: true,
      integration
    });
  };

  // Update integration status when dialog closes
  const handleDialogChange = async (open: boolean) => {
    setDialogState(prev => ({ ...prev, isOpen: open }));
    if (!open) {
      // Refresh statuses when dialog closes
      const response = await fetch('/api/integrations/monday/status');
      const data = await response.json();
      
      setIntegrationStatuses(prev => ({
        ...prev,
        monday: data.connected
      }));
    }
  };

  return (
    <>
      <div className="container mx-auto p-8 space-y-12">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine mb-12">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
          </div>
          <div className="
            absolute inset-[0] 
            rounded-[inherit] 
            [border:1px_solid_transparent] 
            ![mask-clip:padding-box,border-box] 
            ![mask-composite:intersect] 
            [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] 
            after:absolute 
            after:aspect-square 
            after:w-[320px] 
            after:animate-border-beam 
            after:[animation-delay:0s] 
            after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] 
            after:[offset-anchor:90%_50%] 
            after:[offset-path:rect(0_auto_auto_0_round_200px)]
          " />
          <div className="relative p-8 z-10">
            <h1 className="text-4xl font-light text-white mb-2">Integrations</h1>
            <p className="text-neutral-400">
              Connect your favorite tools and services to enhance your workflow
            </p>
          </div>
        </div>

        <div className="space-y-12">
          {INTEGRATIONS.map((category) => (
            <div key={category.category} className="space-y-6">
              <CategoryHeader title={category.category} />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {category.integrations.map((integration) => (
                  <DreamIntegrationCard 
                    key={integration.id} 
                    data={{
                      ...integration,
                      status: integrationStatuses[integration.id] ? 'connected' : 'not_connected'
                    }}
                    onConfigure={handleConfigure}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog 
        open={dialogState.isOpen} 
        onOpenChange={handleDialogChange}
      >
        <DialogContent className="sm:max-w-[600px] bg-neutral-900 border-neutral-800">
          {dialogState.integration?.id === 'monday' && (
            <MondayIntegration />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}