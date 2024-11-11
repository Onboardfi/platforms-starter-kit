"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  CartesianGrid, 
  Line, 
  LineChart, 
  XAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { getAgentAndSiteCounts } from "@/lib/data/dashboard";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DateRangeSelector, DateRange } from "@/components/ui/date-range-selector";

interface ChartDataPoint {
  date: string;
  agents: number;
  sites: number;
  sessions: number;
}

interface ChartProps {
  chartData: ChartDataPoint[];
  className?: string;
}

const chartConfig = {
  agents: {
    label: "Onboards",
    color: "#80FFD2",
  },
  sites: {
    label: "Sites",
    color: "#85B8FE",
  },
  sessions: {
    label: "Sessions",
    color: "#FFCAE2",
  },
} satisfies ChartConfig;

export function Chart({ chartData: initialData, className }: ChartProps) {
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<DateRange>({
    value: '30d',
    label: 'Last 30 Days',
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });

  const handleRangeChange = async (range: DateRange) => {
    try {
      setIsLoading(true);
      setSelectedRange(range);

      const result = await getAgentAndSiteCounts(range.startDate, range.endDate);
      if (result?.data) {
        setChartData(result.data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAgents = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.agents, 0),
    [chartData]
  );

  const totalSites = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.sites, 0),
    [chartData]
  );

  const totalSessions = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.sessions, 0),
    [chartData]
  );

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row sm:h-[99px]">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6">
          <div className="flex items-center justify-between">
            <CardTitle>Overview</CardTitle>
            <DateRangeSelector 
              onRangeChange={handleRangeChange} 
              selectedRange={selectedRange.value} 
            />
          </div>
          <CardDescription>
            {`${selectedRange.startDate.toLocaleDateString()} - ${selectedRange.endDate.toLocaleDateString()}`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap">
          <div
            data-active={true}
            className="flex flex-1 flex-col justify-center gap-1 border-t px-4 py-2 text-left sm:border-l sm:border-t-0 sm:px-6 sm:py-5"
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.agents.label}
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {totalAgents.toLocaleString()}
            </span>
          </div>
          <div
            data-active={true}
            className="flex flex-1 flex-col justify-center gap-1 border-l border-t px-4 py-2 text-left sm:border-t-0 sm:px-6 sm:py-5"
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.sites.label}
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {totalSites.toLocaleString()}
            </span>
          </div>
          <div
            data-active={true}
            className="flex flex-1 flex-col justify-center gap-1 border-l border-t px-4 py-2 text-left sm:border-t-0 sm:px-6 sm:py-5"
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.sessions.label}
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {totalSessions.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("px-2 sm:p-6", isLoading && "opacity-50")}>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="name"
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      });
                    }}
                  />
                }
              />
              <Line
                dataKey="agents"
                name="Onboards"
                type="monotone"
                stroke={chartConfig.agents.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="sites"
                name="Sites"
                type="monotone"
                stroke={chartConfig.sites.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={true}
              />
              <Line
                dataKey="sessions"
                name="Sessions"
                type="monotone"
                stroke={chartConfig.sessions.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}