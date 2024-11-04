// components/agent-console/TabContent/ConversationTab.tsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import axios from 'axios';
import { toast } from 'sonner';

interface ConversationTabProps {
  items: any[];
  currentSessionId: string | null;
}

export function ConversationTab({ items, currentSessionId }: ConversationTabProps) {
  const [messages, setMessages] = useState<any[]>(items);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update messages when items change
  useEffect(() => {
    setMessages(items);
  }, [items]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Format message content for display
  const formatMessageContent = (item: any) => {
    if (item.formatted) {
      return item.formatted.transcript || item.formatted.text || "(Truncated)";
    }
    
    return item.content?.text || item.content?.transcript || "(No content)";
  };

  return (
    <Card className="bg-black border border-gray-800">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Session: {currentSessionId || 'No Active Session'}
          </Badge>
        </div>
        <ScrollArea className="h-[600px]" ref={scrollRef}>
          {!currentSessionId ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 font-mono text-sm">
                No active session selected
              </p>
            </div>
          ) : !messages.length ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 font-mono text-sm">
                No messages in this conversation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((item, i) => (
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
                    {formatMessageContent(item)}
                    {item.metadata?.stepTitle && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {item.metadata.stepTitle}
                      </Badge>
                    )}
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