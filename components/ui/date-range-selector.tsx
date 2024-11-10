"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  value: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

interface DateRangeSelectorProps {
  onRangeChange: (range: DateRange) => void;
  selectedRange?: string;
}

export function DateRangeSelector({ onRangeChange, selectedRange = '30d' }: DateRangeSelectorProps) {
  const ranges: DateRange[] = React.useMemo(() => {
    const now = new Date();
    return [
      { 
        value: '30d', 
        label: 'Last 30 Days',
        startDate: new Date(now.setDate(now.getDate() - 30)),
        endDate: new Date()
      },
      { 
        value: '90d', 
        label: 'Last 3 Months',
        startDate: new Date(now.setDate(now.getDate() - 90)),
        endDate: new Date()
      },
      { 
        value: '180d', 
        label: 'Last 6 Months',
        startDate: new Date(now.setDate(now.getDate() - 180)),
        endDate: new Date()
      },
      { 
        value: 'ytd', 
        label: 'Year to Date',
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date()
      },
      { 
        value: 'all', 
        label: 'All Time',
        startDate: new Date(0),
        endDate: new Date()
      },
    ];
  }, []);

  const handleRangeChange = (value: string) => {
    const selectedRange = ranges.find(range => range.value === value);
    if (selectedRange) {
      onRangeChange(selectedRange);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 rounded-lg border border-border bg-background/50 px-3",
          "hover:bg-background/80 hover:text-foreground",
          "focus-visible:ring-1 focus-visible:ring-ring"
        )}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        <Select value={selectedRange} onValueChange={handleRangeChange}>
          <SelectTrigger className="border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" className="w-[150px]">
            {ranges.map((range) => (
              <SelectItem
                key={range.value}
                value={range.value}
                className="cursor-pointer"
              >
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Button>
    </div>
  );
}