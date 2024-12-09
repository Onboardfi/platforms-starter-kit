"use client"

import { useState, useEffect } from "react";
import { Suspense } from 'react';
import { useRouter } from "next/navigation";
import { getAgentById, getSessions, getSessionMessages } from "@/lib/actions";
import { getSessionAndUsageCountsForAgent } from "@/lib/data/dashboard2";
import { ExternalLink, ArrowLeft, Archive, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { Session } from "@/lib/types";

// Dynamically import components to improve initial page load
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

const ConversationTab = dynamic(
  () => import('@/components/agent-console/TabContent/ConversationTab'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md p-6 shine shadow-dream">
        <div className="h-32 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading messages...</div>
        </div>
      </div>
    )
  }
);

const SessionsTabWrapper = dynamic(
  () =>
    import('@/components/agent-console/TabContent/SessionsTab').then((mod) => {
      const SessionsTabComponent = mod.default || mod;
      return function ClientWrapper({ sessions, agentId, onSessionSelect, ...props }: any) {
        return (
          <SessionsTabComponent
            sessions={sessions}
            agentId={agentId}
            isLoadingSessions={false}
            currentSessionId={null}
            onSessionSelect={onSessionSelect}
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

const SessionDetails = dynamic(
  () =>
    import('@/components/agent-console/TabContent/SessionDetails').then((mod) => {
      return function DetailsWrapper({ session, onBack, messages, primaryColor, secondaryColor }: any) {
        return (
          <div className="space-y-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sessions
            </button>
            
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-light text-white">
                Session: {session.name || "Untitled"}
              </h2>
              <Badge variant="outline" className="text-xs">
                {session.type}
              </Badge>
            </div>

            <ConversationTab 
              items={messages}
              currentSessionId={session.id}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          </div>
        );
      };
    }),
  {
    ssr: false
  }
);

// Component for metric cards with consistent styling
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  gradient = false 
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  gradient?: boolean;
}) => (
  <Card className={`
    relative overflow-hidden backdrop-blur-md border-white/10 group
    ${gradient ? 'bg-gradient-to-br from-neutral-800/50 to-neutral-900/50' : 'bg-neutral-800/50'}
  `}>
    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-light text-neutral-300">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
      </div>
    </CardHeader>
    
    <CardContent className="space-y-2">
      <p className="text-3xl font-light text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p className="text-xs text-neutral-400">
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
);

// Main analytics component
export default function AgentAnalytics({ params }: { params: { id: string }}) {
  const router = useRouter();
  const [viewingSession, setViewingSession] = useState<{
    session: Session;
    messages: any[];
  } | null>(null);
  const [agent, setAgent] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const agentData = await getAgentById(decodeURIComponent(params.id));
        
        if (!agentData) {
          router.push('/login');
          return;
        }

        if (!isMounted) return;
        setAgent(agentData);

        const dbSessions = await getSessions(agentData.id);
        
        if (!isMounted) return;
        
        const formattedSessions = dbSessions.map((s) => ({
          id: s.id,
          name: s.name || "Untitled Session",
          status: s.status as "active" | "completed" | "abandoned",
          type: s.type as "internal" | "external",
          stepProgress: {
            steps: s.stepProgress?.steps.map((step) => ({
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

        setSessions(formattedSessions);

        const charts = await getSessionAndUsageCountsForAgent(agentData.id);
        if (!isMounted) return;
        setChartData(charts.data);

      } catch (error: any) {
        console.error("Error loading data:", error);
        if (isMounted) {
          if (error.message?.includes('unauthorized') || error.message?.includes('Unauthorized')) {
            router.push('/login');
            return;
          }
          
          setError("Failed to load agent data");
          toast.error("Failed to load agent data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [params.id, router]);

  // Calculate completion rate accounting for partial progress
  const calculateAverageCompletionRate = () => {
    if (!sessions.length) return 0;

    const sessionCompletionRates = sessions.map(session => {
      const steps = session.stepProgress?.steps || [];
      if (!steps.length) return 0;
      
      const completedSteps = steps.filter(step => step.completed).length;
      return (completedSteps / steps.length) * 100;
    });

    const totalCompletionRate = sessionCompletionRates.reduce((sum, rate) => sum + rate, 0);
    return Math.round(totalCompletionRate / sessions.length);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading agent data...</div>
      </div>
    );
  }

  // Error state
  if (error || !agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-sm text-red-400">{error || "Failed to load agent"}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm text-white bg-neutral-800 rounded-lg hover:bg-neutral-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Session details view
  if (viewingSession) {
    return (
      <SessionDetails
        session={viewingSession.session}
        messages={viewingSession.messages}
        onBack={() => setViewingSession(null)}
        primaryColor={agent.settings?.primaryColor}
        secondaryColor={agent.settings?.secondaryColor}
      />
    );
  }

  // Main analytics view
  return (
    <div className="space-y-8">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

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
        <h2 className="text-xl font-cal text-white mb-6">Sessions Over Time</h2>
        {chartData ? (
          <Suspense fallback={
            <div className="h-[500px] w-full flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading chart...</div>
            </div>
          }>
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

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Average Completion Rate"
          value={`${calculateAverageCompletionRate()}%`}
          subtitle="Average percentage of completed steps across all sessions"
          icon={CheckCircle2}
          gradient
        />

        <MetricCard
          title="Total Sessions"
          value={sessions.length}
          subtitle="Total number of onboarding sessions created"
          icon={Archive}
        />

        <MetricCard
          title="Active Sessions"
          value={sessions.filter((s) => s.status === "active").length}
          subtitle="Currently ongoing onboarding sessions"
          icon={Clock}
        />
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
         {agent && (
            <SessionsTabWrapper
              sessions={sessions}
              agentId={agent.id}
              primaryColor={agent.settings?.primaryColor || "#000000"}
              secondaryColor={agent.settings?.secondaryColor || "#000000"}
              allowMultipleSessions={agent.settings?.allowMultipleSessions}
              onSessionSelect={async (sessionId: string) => {
                const selectedSession = sessions.find(s => s.id === sessionId);
                if (selectedSession) {
                  try {
                    // When a session is selected, we fetch its messages and update the state
                    const messages = await getSessionMessages(sessionId);
                    setViewingSession({ 
                      session: selectedSession, 
                      messages 
                    });
                  } catch (error) {
                    console.error('Error fetching session messages:', error);
                    toast.error('Failed to load session messages');
                  }
                }
              }}
            />
          )}
        </Suspense>
      </div>

   
    </div>
  );
}