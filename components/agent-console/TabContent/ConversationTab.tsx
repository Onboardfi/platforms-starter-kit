import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import axios from 'axios';
import { toast } from 'sonner';
import { MessageCircle, User } from "lucide-react";

interface ConversationTabProps {
  items: any[];
  currentSessionId: string | null;
}

export function ConversationTab({ items, currentSessionId }: ConversationTabProps) {
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
    <Card className="bg-neutral-900/50 border-0 backdrop-blur-lg rounded-3xl overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Badge 
            variant="outline" 
            className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 
                     text-xs font-light text-white/70 hover:bg-white/10 transition-all 
                     duration-300 shine"
          >
            <div className="flex items-center space-x-2">
              <MessageCircle size={12} className="opacity-50" />
              <span>Session: {currentSessionId || 'No Active Session'}</span>
            </div>
          </Badge>
        </div>

        {/* Messages Area */}
        <ScrollArea 
          className="h-[600px] px-2" 
          ref={scrollRef}
        >
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
                    "flex w-full animate-dream-fade-up",
                    item.role === "assistant" ? "justify-start" : "justify-end"
                  )}
                  style={{
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  <div
                    className={cn(
                      "group relative max-w-[80%] transition-all duration-300",
                      item.role === "assistant" ? "pr-4" : "pl-4"
                    )}
                  >
                    {/* Message Content */}
                    <div
                      className={cn(
                        "px-6 py-4 rounded-2xl font-light text-sm backdrop-blur-sm",
                        item.role === "assistant" 
                          ? "bg-white/5 text-white/90 rounded-tl-sm" 
                          : "bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-white/90 rounded-tr-sm"
                      )}
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
                                     bg-white/5 border-white/10 text-white/50"
                          >
                            {item.metadata.stepTitle}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Hover Effect Gradient Border */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
                        "bg-gradient-to-r from-purple-500/20 via-transparent to-blue-500/20 -z-10",
                        "group-hover:opacity-100"
                      )}
                    />
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
    <div className="flex flex-col items-center justify-center h-full">
      <div className="p-4 rounded-full bg-white/5 mb-4">
        <MessageCircle className="w-6 h-6 text-white/20" />
      </div>
      <p className="text-white/40 font-light text-sm">
        {message}
      </p>
    </div>
  );
}