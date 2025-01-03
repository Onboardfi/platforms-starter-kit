// components/agent-console/TabContent/ConversationTab.tsx

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, User, Clock } from "lucide-react";

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: {
    text?: string;
    transcript?: string;
    audioUrl?: string;
  }[];
  metadata?: {
    audioDurationSeconds?: number;
    audio?: {
      sampleRate: number;
      channels?: number;
    };
    stepTitle?: string;
  };
  status: 'completed' | 'pending';
}

interface ConversationTabProps {
  items: ConversationMessage[];
  currentSessionId: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function ConversationTab({
  items,
  currentSessionId,
  primaryColor = '#7928CA',
  secondaryColor = '#FF0080',
}: ConversationTabProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Single useEffect to handle message updates and deduplication
  useEffect(() => {
    // Create a map to store unique messages by ID
    const messageMap = new Map<string, ConversationMessage>();
    
    // Process items in order, keeping only the latest version of each message
    items.forEach(item => {
      messageMap.set(item.id, item);
    });
    
    // Convert map values back to array to maintain order
    const uniqueMessages = Array.from(messageMap.values());
    
    console.log('Processed messages:', uniqueMessages);
    setMessages(uniqueMessages);
  }, [items]);

  // Keep scroll at bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const formatMessageContent = (item: ConversationMessage) => {
    // Handle array of content
    if (Array.isArray(item.content) && item.content.length > 0) {
      const content = item.content[0]; // Get first content item
      return (
        content.text || // Try text first
        content.transcript || // Then transcript
        "(No content)" // Fallback
      );
    }
    
    // Fallback for unexpected content structure
    return "(No content)";
  };
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '';
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
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
              {messages.map((item) => (
                <div
                  key={`${item.id}-${item.role}`} // Use combination of id and role for unique key
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
                      {/* Role Icon and Audio Duration */}
                      <div className="flex items-center justify-between mb-2 text-xs text-white/50">
                        <div className="flex items-center space-x-2">
                          {item.role === "assistant" ? (
                            <MessageCircle size={12} />
                          ) : (
                            <User size={12} />
                          )}
                          <span className="capitalize">{item.role}</span>
                        </div>
                        {item.metadata?.audioDurationSeconds && (
                          <div className="flex items-center space-x-1">
                            <Clock size={12} className="opacity-50" />
                            <span>
                              {formatDuration(item.metadata.audioDurationSeconds)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Message Text */}
                      <div className="space-y-2">
                        <p className="leading-relaxed">
                          {formatMessageContent(item)}
                        </p>

                        {/* Audio Info Badge */}
                        {item.metadata?.audio && (
                          <Badge
                            variant="outline"
                            className="mt-2 mr-2 text-[10px] px-2 py-0.5 rounded-full
                                     bg-white/5 border-white/10 text-white/50 shine"
                          >
                            {`${item.metadata.audio.sampleRate/1000}kHz`}
                            {item.metadata.audio.channels && ` · ${item.metadata.audio.channels}ch`}
                          </Badge>
                        )}

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
