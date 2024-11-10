import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Grid, Box, ArrowUpRight, Plug } from "lucide-react";
import Image from "next/image";

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
        name: "Github",
        description: "Sync code and collaborate with your team seamlessly.",
        category: "Development",
        image: "/github.png",
        status: "not_connected",
        docUrl: "/docs/integrations/github",
      }
    ]
  },
  {
    category: "Communication & Collaboration",
    integrations: [
      {
        id: "slack",
        name: "Slack",
        description: "Keep your team connected with real-time updates.",
        category: "Communication",
        image: "/slack1.png",
        status: "not_connected",
        docUrl: "/docs/integrations/slack",
      },
      {
        id: "notion",
        name: "Notion",
        description: "Sync docs and projects for smarter collaboration.",
        category: "Collaboration",
        image: "/notion1.png",
        status: "not_connected",
        docUrl: "/docs/integrations/notion",
      }
    ]
  },
  {
    category: "Marketing & Payments",
    integrations: [
      {
        id: "mailchimp",
        name: "Mailchimp",
        description: "Automate email and manage contacts with ease.",
        category: "Marketing",
        image: "/mailchimp.png",
        status: "not_connected",
        docUrl: "/docs/integrations/mailchimp",
      },
      {
        id: "stripe",
        name: "Stripe",
        description: "Manage payments and track transactions in real time.",
        category: "Payments",
        image: "/stripe.png",
        status: "not_connected",
        docUrl: "/docs/integrations/stripe",
      }
    ]
  },
  {
    category: "Data & Storage",
    integrations: [
      {
        id: "sheets",
        name: "Google Sheets",
        description: "Keep your data in sync for easy tracking and updates.",
        category: "Data",
        image: "/sheets.png",
        status: "not_connected",
        docUrl: "/docs/integrations/sheets",
      }
    ]
  }
];

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
      {/* Logo */}
      <div className="mb-4 w-12 h-12 rounded-xl bg-neutral-900/50 border border-white/[0.08] shine overflow-hidden relative">
        <Image
          src={data.image}
          alt={`${data.name} logo`}
          fill
          className="object-contain p-2"
        />
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
        {INTEGRATIONS.map((category) => (
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