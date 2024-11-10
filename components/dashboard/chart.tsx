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

interface ChartDataPoint {
  date: string;
  agents: number;
  sites: number;
}

interface ChartProps {
  chartData: ChartDataPoint[];
  className?: string;
}

const chartConfig = {
  agents: {
    label: "Onboards",
    color: "#8884d8",
  },
  sites: {
    label: "Sites",
    color: "#82ca9d",
  },
} satisfies ChartConfig;

export function Chart({ chartData, className }: ChartProps) {
  const totalAgents = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + Number(curr.agents), 0),
    [chartData]
  );

  const totalSites = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + Number(curr.sites), 0),
    [chartData]
  );

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row sm:h-[99px]">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6">
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Showing total counts for the past month
          </CardDescription>
        </div>
        <div className="flex">
          <div
            data-active={true}
            className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-2 text-left sm:border-l sm:border-t-0 sm:px-8 sm:py-5"
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
            className="flex flex-1 flex-col justify-center gap-1 border-l border-t px-6 py-2 text-left sm:border-t-0 sm:px-8 sm:py-5"
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.sites.label}
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {totalSites.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
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
  isAnimationActive={false} // Optional: disable animation for accurate initial render
  connectNulls={true} // Connect points if there are gaps in data
/>
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}