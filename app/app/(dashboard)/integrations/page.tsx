
// app/app/(dashboard)/integrations/page.tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import IntegrationCard, { Integration } from "@/components/integration-card";

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

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-cal">Integrations</h1>
      </div>

      <div className="space-y-12">
        {SAMPLE_INTEGRATIONS.map((category) => (
          <div key={category.category} className="space-y-4">
            <h2 className="text-2xl font-cal">{category.category}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.integrations.map((integration) => (
                <IntegrationCard key={integration.id} data={integration} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}