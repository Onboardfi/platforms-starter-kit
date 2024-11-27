// app/(dashboard)/agent/[id]/analytics/page.tsx
import { Suspense } from 'react';
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getAgentById, getSessions } from "@/lib/actions";
import { getSessionAndUsageCountsForAgent } from "@/lib/data/dashboard2";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { Session } from "@/lib/types";

// Dynamically import the Chart component with no SSR
const Chart = dynamic(
  () => import('@/components/dashboard/session-chart').then((mod) => mod.Chart),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 w-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading chart...</div>
      </div>
    )
  }
);

// Dynamically import SessionsTab with client-side rendering
const SessionsTabWrapper = dynamic(
  () =>
    import('@/components/agent-console/TabContent/SessionsTab').then((mod) => {
      // 
      const SessionsTabComponent = mod.default || mod;
      return function ClientWrapper({ sessions, agentId, ...props }: any) {
        return (
          <SessionsTabComponent
            sessions={sessions}
            agentId={agentId}
            isLoadingSessions={false}
            currentSessionId={null}
            primaryColor={props.primaryColor}
            secondaryColor={props.secondaryColor}
            allowMultipleSessions={props.allowMultipleSessions}
            readonly={true}
          />
        );
      };
    }),
  { 
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream">
        <div className="h-32 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading sessions...</div>
        </div>
      </div>
    )
  }
);

export default async function AgentAnalytics({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const agent = await getAgentById(decodeURIComponent(params.id));
  if (!agent || agent.createdBy !== session.user.id) {
    notFound();
  }

  // Fetch sessions and convert to Session type with proper null handling
  const dbSessions = await getSessions(agent.id);
  const sessions: Session[] = dbSessions.map((s) => ({
    id: s.id,
    name: s.name || "Untitled Session",
    status: s.status as "active" | "completed" | "abandoned",
    type: s.type as "internal" | "external",
    stepProgress: {
      steps:
        s.stepProgress?.steps.map((step) => ({
          id: step.id,
          title: step.title,
          description: step.description,
          completed: step.completed,
          completedAt: step.completedAt || undefined,
          completionTool: step.completionTool,
        })) || [],
    },
    createdAt: s.createdAt.toISOString(),
    lastInteractionAt: s.lastInteractionAt?.toISOString(),
    metadata: s.metadata || {},
  }));

  // Fetch chart data for the specific agent
  let chartData;
  try {
    const charts = await getSessionAndUsageCountsForAgent(agent.id);
    chartData = charts.data;
  } catch (error) {
    console.error("Error fetching session and usage counts for agent:", error);
    // Handle error more gracefully instead of notFound()
    chartData = null;
  }

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        {/* Gradient Border Effect */}
        <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />

        <div className="relative p-8 z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-3xl font-light text-white">
              Analytics for {agent?.name || "Agent"}
            </h1>

            {agent?.site?.subdomain && (
              <Link
                href={`https://${agent.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${agent.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900/50 text-neutral-300 hover:text-white transition-colors duration-300 group"
              >
                <span className="text-sm">View Live Agent</span>
                <ExternalLink className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

{/* Chart Section */}
<div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream">
  <h2 className="text-xl font-cal text-white mb-6">Sessions and Usage Duration Over Time</h2>
  {chartData ? (
    <Suspense 
      fallback={
        <div className="h-[500px] w-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading chart...</div>
        </div>
      }
    >
      <Chart
        agentId={agent.id}
        chartData={chartData}
        className="w-full"
      />
    </Suspense>
  ) : (
    <div className="h-[500px] w-full flex items-center justify-center">
      <div className="text-sm text-muted-foreground">No data available</div>
    </div>
  )}
</div>
      {/* Sessions Table */}
      <div className="relative">
        <Suspense fallback={
          <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream">
            <div className="h-32 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading sessions...</div>
            </div>
          </div>
        }>
          <SessionsTabWrapper
            sessions={sessions}
            agentId={agent.id}
            primaryColor={agent.settings?.primaryColor || "#000000"}
            secondaryColor={agent.settings?.secondaryColor || "#000000"}
            allowMultipleSessions={agent.settings?.allowMultipleSessions}
          />
        </Suspense>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Completion Rate Card */}
        <Card className="bg-neutral-800/50 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-light">
              Average Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-light">
              {sessions.length > 0
                ? `${Math.round(
                    (sessions.filter((s) =>
                      s.stepProgress?.steps.every((step) => step.completed)
                    ).length /
                      sessions.length) *
                      100
                  )}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        {/* Total Sessions Card */}
        <Card className="bg-neutral-800/50 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-light">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-light">{sessions.length}</p>
          </CardContent>
        </Card>

        {/* Active Sessions Card */}
        <Card className="bg-neutral-800/50 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-light">
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-light">
              {sessions.filter((s) => s.status === "active").length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}