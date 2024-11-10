


import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Integration } from "@/components/integration-card";
import { Grid, Box, ArrowUpRight, Plug } from "lucide-react";

interface IntegrationCategory {
  category: string;
  integrations: Integration[];
}

const SAMPLE_INTEGRATIONS: IntegrationCategory[] = [
  {
    category: "CRM",
    integrations: [
      {
        id: "salesforce",
        name: "Salesforce",
        description: "Connect your Salesforce account to sync contacts, leads, and opportunities.",
        category: "CRM",
        image: null,
        status: "not_connected" as const,
        docUrl: "/docs/integrations/salesforce",
      },
      {
        id: "hubspot",
        name: "HubSpot",
        description: "Sync your HubSpot CRM data and automate your marketing workflows.",
        category: "CRM",
        image: null,
        status: "not_connected" as const,
        docUrl: "/docs/integrations/hubspot",
      },
    ],
  },
  {
    category: "Marketing",
    integrations: [
      {
        id: "mailchimp",
        name: "Mailchimp",
        description: "Connect your email marketing campaigns and automation workflows.",
        category: "Marketing",
        image: null,
        status: "not_connected" as const,
        docUrl: "/docs/integrations/mailchimp",
      },
      {
        id: "klaviyo",
        name: "Klaviyo",
        description: "Sync your customer data and automate your email marketing.",
        category: "Marketing",
        image: null,
        status: "not_connected" as const,
        docUrl: "/docs/integrations/klaviyo",
      },
    ],
  },
  {
    category: "Analytics",
    integrations: [
      {
        id: "ga4",
        name: "Google Analytics 4",
        description: "Track website traffic and user behavior with Google Analytics 4.",
        category: "Analytics",
        image: null,
        status: "not_connected" as const,
        docUrl: "/docs/integrations/ga4",
      },
      {
        id: "mixpanel",
        name: "Mixpanel",
        description: "Track and analyze user interactions with your product.",
        category: "Analytics",
        image: null,
        status: "not_connected" as const,
        docUrl: "/docs/integrations/mixpanel",
      },
    ],
  },
];

// Dream UI Category Header
const CategoryHeader = ({ title }: { title: string }) => (
  <div className="relative overflow-hidden rounded-2xl bg-neutral-900/30 backdrop-blur-md p-4 mb-6">
    {/* Background Elements */}
    <div className="absolute inset-0 -z-10">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/50" />
    </div>
    <div className="relative flex items-center gap-3 z-10">
      <Grid className="h-5 w-5 text-dream-cyan" />
      <h2 className="text-xl font-light text-white">{title}</h2>
    </div>
  </div>
);


// Dream UI Integration Card
const DreamIntegrationCard = ({ data }: { data: Integration }) => (
  <div className="group relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
    {/* Gradient Border Effect */}
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
      {/* Icon */}
      <div className="mb-4 p-3 w-fit rounded-xl bg-neutral-900/50 border border-white/[0.08] shine">
        <Plug className="h-5 w-5 text-dream-cyan" />
      </div>

      {/* Content */}
      <h3 className="text-lg font-medium text-white mb-2">{data.name}</h3>
      <p className="text-sm text-neutral-400 mb-6 flex-grow">
        {data.description}
      </p>

      {/* Status and Action */}
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
      </div>
    </div>
  </div>
);

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-8 space-y-12">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine mb-12">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          {/* Gradient Overlay to Fade Grid */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        {/* Gradient Border Effect */}
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

        {/* Header Content */}
        <div className="relative p-8 z-10">
          <h1 className="text-4xl font-light text-white mb-2">Integrations</h1>
          <p className="text-neutral-400">
            Connect your favorite tools and services to enhance your workflow
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-12">
        {SAMPLE_INTEGRATIONS.map((category) => (
          <div key={category.category} className="space-y-6">
            <CategoryHeader title={category.category} />
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.integrations.map((integration) => (
                <DreamIntegrationCard 
                  key={integration.id} 
                  data={integration} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}