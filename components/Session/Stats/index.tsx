import React, { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { cn } from "@/lib/utils";

import { Button } from "../../ui/button";
import HelpTip from "../../ui/helptip";
import StatsAggregator from "@/utils/stats_aggregator";

// Type definitions
interface MetricValue {
  latest?: number;
  high?: number;
  median?: number;
  low?: number;
  timeseries: number[];
}

interface ServiceMetrics {
  ttfb: MetricValue;
  characters?: MetricValue;
  processing?: MetricValue;
}

type StatsMap = Record<string, ServiceMetrics>;

interface StatsProps {
  statsAggregator: StatsAggregator;
  handleClose: () => void;
}

interface StatsTileProps {
  service: string;
  sub?: string;
  metric: string;
  tip?: string;
  multiplier?: number;
  data: MetricValue;
}

const StatsTile: React.FC<StatsTileProps> = ({
  service,
  metric,
  tip,
  sub = "s",
  multiplier = 3,
  data,
}) => {
  // Convert timeseries data to format Recharts expects
  const chartData = data.timeseries.map((value, index) => ({
    value,
    index
  }));

  return (
    <div className="p-4 bg-black/20 rounded-lg border border-primary-200/10 backdrop-blur">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary-100">
          {service.charAt(0).toUpperCase() + service.slice(1)} {metric}
          {tip && <HelpTip text={tip} />}
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-primary-400">
          <span>Latest</span>
          <span className="font-medium">
            {data.latest?.toFixed(multiplier)}
            <sub>{sub}</sub>
          </span>
        </div>
      </header>
      
      <div className="w-full h-20 bg-black/10 rounded overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#41c3f9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#41c3f9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#41c3f9"
              fill="url(#colorValue)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <footer className="flex justify-between mt-4 text-xs text-primary-400">
        <div className="flex items-center gap-1">
          H:
          <span className="font-medium">
            {data.high?.toFixed(multiplier)}
            <sub>{sub}</sub>
          </span>
        </div>
        <div className="flex items-center gap-1">
          M:
          <span className="font-medium">
            {data.median?.toFixed(multiplier)}
            <sub>{sub}</sub>
          </span>
        </div>
        <div className="flex items-center gap-1">
          L:
          <span className="font-medium">
            {data.low?.toFixed(multiplier)}
            <sub>{sub}</sub>
          </span>
        </div>
      </footer>
    </div>
  );
};

export const Stats = React.memo(
  ({ statsAggregator, handleClose }: StatsProps) => {
    const [currentStats, setCurrentStats] = useState<StatsMap>(
      statsAggregator.statsMap
    );
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current!);
      }

      intervalRef.current = setInterval(async () => {
        // Get latest stats from aggregator
        const newStats = statsAggregator.getStats();
        if (newStats) {
          setCurrentStats({ ...newStats });
        }
      }, 2500);

      return () => clearInterval(intervalRef.current!);
    }, [statsAggregator]);

    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-black/80 backdrop-blur shadow-xl">
        <div className="absolute top-0 right-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="m-3"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-full overflow-auto p-4">
          <section className="space-y-6">
            {Object.entries(currentStats).length < 1 ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              Object.entries(currentStats).map(([service, metrics], index) => (
                <div key={service} className="space-y-4">
                  <StatsTile
                    key={`${service}-ttfb-${index}`}
                    metric="TTFB"
                    tip="Time to first byte"
                    service={service}
                    multiplier={3}
                    data={metrics.ttfb}
                  />
                  {metrics.characters && (
                    <StatsTile
                      key={`${service}-chars-${index}`}
                      metric="Characters"
                      sub=""
                      service={service}
                      multiplier={0}
                      data={metrics.characters}
                    />
                  )}
                  {metrics.processing && (
                    <StatsTile
                      key={`${service}-proc-${index}`}
                      metric="Processing"
                      service={service}
                      data={metrics.processing}
                    />
                  )}
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    );
  },
  () => true
);

Stats.displayName = "Stats";

export default Stats;