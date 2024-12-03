"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  CartesianGrid, 
  Line, 
  LineChart, 
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DateRange {
  value: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

interface ChartDataPoint {
  date: string;
  sessions: number;
  messages: number; // Add messages to the data point structure
}

interface ChartProps {
  agentId: string;
  chartData: ChartDataPoint[];
  className?: string;
}

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "#85B8FE",
  },
  messages: {  // Add configuration for messages
    label: "Messages",
    color: "#FFCAE2",
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-md">
      <p className="font-medium">
        {new Date(label).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

const ChartComponent = ({ agentId, chartData: initialData, className }: ChartProps) => {
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedRange] = React.useState<DateRange>({
    value: '30d',
    label: 'Last 30 Days',
    startDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  React.useEffect(() => {
    setChartData(initialData);
  }, [initialData]);

  const formattedChartData = React.useMemo(() => {
    return chartData.map(point => ({
      ...point,
      date: new Date(point.date).toISOString(),
    }));
  }, [chartData]);

  // Calculate max values for both metrics for better scaling
  const maxSessions = Math.max(...formattedChartData.map(d => d.sessions));
  const maxMessages = Math.max(...formattedChartData.map(d => d.messages));
  
  // Calculate domains with 10% padding
  const sessionsDomain = [0, Math.ceil(maxSessions * 1.1)];
  const messagesDomain = [0, Math.ceil(maxMessages * 1.1)];

  if (!formattedChartData?.length) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col justify-center gap-1">
          <div className="flex items-center justify-between">
            <CardTitle>Session and Message Activity</CardTitle>
          </div>
          <CardDescription>
            {`${selectedRange.startDate.toLocaleDateString()} - ${selectedRange.endDate.toLocaleDateString()}`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-4 sm:ml-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {chartConfig.sessions.label}
            </span>
            <span className="text-lg font-bold">
              {formattedChartData.reduce((acc, curr) => acc + (curr.sessions || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {chartConfig.messages.label}
            </span>
            <span className="text-lg font-bold">
              {formattedChartData.reduce((acc, curr) => acc + (curr.messages || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("p-4 h-[500px]", isLoading && "opacity-50")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedChartData}
            margin={{
              top: 20,
              right: 50, // Increased right margin for second Y-axis
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={true}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
              stroke="#666"
            />
            <YAxis 
              yAxisId="left"
              tickLine={false}
              axisLine={true}
              tickMargin={8}
              stroke="#666"
              domain={sessionsDomain}
              allowDecimals={false}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={true}
              tickMargin={8}
              stroke="#666"
              domain={messagesDomain}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Line
              yAxisId="left"
              dataKey="sessions"
              name={chartConfig.sessions.label}
              type="monotone"
              stroke={chartConfig.sessions.color}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              dataKey="messages"
              name={chartConfig.messages.label}
              type="monotone"
              stroke={chartConfig.messages.color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const Chart = ChartComponent;
export type { ChartProps, ChartDataPoint };