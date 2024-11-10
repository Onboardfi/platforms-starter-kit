import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, User } from "lucide-react";

interface ConversationTabProps {
  items: any[];
  currentSessionId: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export function ConversationTab({
  items,
  currentSessionId,
  primaryColor = '#7928CA',
  secondaryColor = '#FF0080',
}: ConversationTabProps) {
  const [messages, setMessages] = useState<any[]>(items);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(items);
  }, [items]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessageContent = (item: any) => {
    if (item.formatted) {
      return item.formatted.transcript || item.formatted.text || "(Truncated)";
    }
    return item.content?.text || item.content?.transcript || "(No content)";
  };

  return (
    <Card className="bg-background/60 border-0 backdrop-blur-dream rounded-3xl overflow-hidden shadow-dream-lg">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Badge
            variant="outline"
            className="px-4 py-1.5 rounded-full border border-white/10 bg-background/70 
                       text-xs font-light text-white/70 backdrop-blur-md shine"
          >
            <div className="flex items-center space-x-2">
              <MessageCircle size={12} className="opacity-50" />
              <span>Session: {currentSessionId || 'No Active Session'}</span>
            </div>
          </Badge>
        </div>

        {/* Messages Area */}
        <ScrollArea className="h-[600px] px-2" ref={scrollRef}>
          {!currentSessionId ? (
            <EmptyState message="No active session selected" />
          ) : !messages.length ? (
            <EmptyState message="No messages in this conversation" />
          ) : (
            <div className="space-y-6 py-4">
              {messages.map((item, i) => (
                <div
                  key={item.id || i}
                  className={cn(
                    "flex w-full",
                    item.role === "assistant" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "relative max-w-[80%]",
                      item.role === "assistant" ? "pr-4" : "pl-4"
                    )}
                  >
                    {/* Message Content */}
                    <div
                      className={cn(
                        "px-6 py-4 rounded-2xl font-light text-sm backdrop-blur-dream shine",
                        item.role === "assistant"
                          ? "rounded-tl-sm"
                          : "rounded-tr-sm"
                      )}
                      style={{
                        backgroundColor:
                          item.role === "assistant"
                            ? `${secondaryColor}1A` // 10% opacity
                            : `${primaryColor}1A`, // 10% opacity
                        color: 'white',
                      }}
                    >
                      {/* Role Icon */}
                      <div className="flex items-center space-x-2 mb-2 text-xs text-white/50">
                        {item.role === "assistant" ? (
                          <MessageCircle size={12} />
                        ) : (
                          <User size={12} />
                        )}
                        <span className="capitalize">{item.role}</span>
                      </div>

                      {/* Message Text */}
                      <div className="space-y-2">
                        <p className="leading-relaxed">
                          {formatMessageContent(item)}
                        </p>

                        {/* Step Badge */}
                        {item.metadata?.stepTitle && (
                          <Badge
                            variant="outline"
                            className="mt-2 text-[10px] px-2 py-0.5 rounded-full
                                       bg-white/5 border-white/10 text-white/50 shine"
                          >
                            {item.metadata.stepTitle}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Removed Hover Effect Gradient Border */}
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

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="p-4 rounded-full bg-white/5 mb-4 shine">
        <MessageCircle className="w-6 h-6 text-white/20" />
      </div>
      <p className="text-white/40 font-light text-sm text-center px-4">
        {message}
      </p>
    </div>
  );
}
