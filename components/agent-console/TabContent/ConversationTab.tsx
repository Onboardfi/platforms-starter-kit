// components/agent-console/TabContent/ConversationTab.tsx

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConversationTabProps {
  items: any[];
  currentSessionId: string | null;
}

export function ConversationTab({ items, currentSessionId }: ConversationTabProps) {
  return (
    <Card className="bg-black border border-gray-800">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Session: {currentSessionId || 'No Active Session'}
          </Badge>
        </div>
        <ScrollArea className="h-[600px]">
          {!currentSessionId ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 font-mono text-sm">
                No active session selected
              </p>
            </div>
          ) : !items.length ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 font-mono text-sm">
                Waiting for connection...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, i) => (
                <div
                  key={item.id || i}
                  className={cn(
                    "flex",
                    item.role === "assistant" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] px-4 py-2 rounded-lg font-mono text-sm",
                      item.role === "assistant" 
                        ? "bg-dark-accent-1 text-white" 
                        : "bg-dark-accent-2 text-white"
                    )}
                  >
                    {item.formatted.transcript || item.formatted.text || "(Truncated)"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}