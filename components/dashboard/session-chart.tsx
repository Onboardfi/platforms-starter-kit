// components/dashboard/session-chart.tsx

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  CartesianGrid, 
  Line, 
  LineChart, 
  XAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
// Import any additional necessary components or utilities
import { DateRangeSelector, DateRange } from "@/components/ui/date-range-selector";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";

interface ChartDataPoint {
  date: string;
  sessions: number;
  totalDuration: number; // in seconds
}

interface ChartProps {
  agentId: string; // Added agentId
  chartData: ChartDataPoint[];
  className?: string;
}

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "#85B8FE", // Blueish color
  },
  totalDuration: {
    label: "Usage Duration (Minutes)",
    color: "#FFCAE2", // Pinkish color
  },
} satisfies Record<string, { label: string; color: string }>;

export function Chart({ agentId, chartData: initialData, className }: ChartProps) {
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<DateRange>({
    value: '30d',
    label: 'Last 30 Days',
    startDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // Corrected to prevent mutation
    endDate: new Date()
  });

  React.useEffect(() => {
    setChartData(initialData);
  }, [initialData]);

  const handleRangeChange = async (range: DateRange) => {
    try {
      setIsLoading(true);
      setSelectedRange(range);

      // ✅ Use agentId from props, not from range
      const response = await fetch(`/api/agent/${agentId}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const result = await response.json();
      setChartData(result.data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Optionally, set an error state to display in the UI
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total durations in minutes for display purposes
  const formattedChartData = React.useMemo(() => {
    return chartData.map(point => ({
      ...point,
      totalDurationMinutes: point.totalDuration / 60, // Keep as number
    }));
  }, [chartData]);

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row sm:h-[99px]">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6">
          <div className="flex items-center justify-between">
            <CardTitle>Sessions and Usage Overview</CardTitle>
            {/* Enable Date Range Selector */}
            <DateRangeSelector 
              onRangeChange={handleRangeChange} 
              selectedRange={selectedRange.value} 
            />
          </div>
          <CardDescription>
            {/* Display selected date range */}
            {`${selectedRange.startDate.toLocaleDateString()} - ${selectedRange.endDate.toLocaleDateString()}`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap">
          <div
            data-active={true}
            className="flex flex-1 flex-col justify-center gap-1 border-t px-4 py-2 text-left sm:border-l sm:border-t-0 sm:px-6 sm:py-5"
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.sessions.label}
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {formattedChartData.reduce((acc, curr) => acc + curr.sessions, 0).toLocaleString()}
            </span>
          </div>
          <div
            data-active={true}
            className="flex flex-1 flex-col justify-center gap-1 border-l border-t px-4 py-2 text-left sm:border-t-0 sm:px-6 sm:py-5"
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.totalDuration.label}
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {formattedChartData.reduce((acc, curr) => acc + curr.totalDurationMinutes, 0).toFixed(2)} mins
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("px-2 sm:p-6", isLoading && "opacity-50")}>
        <ChartContainer
          config={chartConfig}
          className="w-full h-full" // Ensure full height
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedChartData}
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
              <Tooltip
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
                dataKey="sessions"
                name={chartConfig.sessions.label}
                type="monotone"
                stroke={chartConfig.sessions.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="totalDurationMinutes"
                name={chartConfig.totalDuration.label}
                type="monotone"
                stroke={chartConfig.totalDuration.color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}