import { Button } from '@/components/ui/button';
import { FooterProps } from '../utils/types';
import { X, Zap, Mic } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from "@/lib/utils";

interface ConversationControlsProps extends FooterProps {
  primaryColor?: string;
  secondaryColor?: string;
}

export function ConversationControls({
  isConnected,
  isRecording,
  canPushToTalk,
  connectConversation,
  disconnectConversation,
  startRecording,
  stopRecording,
  changeTurnEndType,
  primaryColor = '#7928CA',
  secondaryColor = '#FF0080',
}: ConversationControlsProps) {
  return (
    <div className="bg-background/60 backdrop-blur-dream rounded-2xl p-6 shadow-dream-lg shine">
      <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 lg:space-x-6">
        {/* Connect/Disconnect Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={isConnected ? disconnectConversation : connectConversation}
          className={cn(
            "h-8 text-xs flex items-center px-4 py-2 rounded-full transition-all duration-300 shine",
            isConnected
              ? "border bg-transparent hover:opacity-90"
              : "text-white hover:opacity-90"
          )}
          style={
            isConnected
              ? {
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: 'transparent',
                  // Hover effect
             
                }
              : {
                  backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                  color: 'white',
                }
          }
        >
          {isConnected ? (
            <X className="h-4 w-4 mr-2" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {isConnected ? "Disconnect" : "Connect"}
        </Button>

        {/* Turn Detection Switch */}
        <div className="flex items-center space-x-2 shine">
          <Switch
            checked={!canPushToTalk}
            onCheckedChange={(checked) =>
              changeTurnEndType(checked ? "server_vad" : "none")
            }
            className="bg-background/70 border border-white/10"
          />
          <span className="text-sm text-white/70 font-mono">
            {canPushToTalk ? "Manual" : "Voice Activity Detection"}
          </span>
        </div>

        {/* Push to Talk Button */}
        {isConnected && canPushToTalk && (
          <Button
            variant="outline"
            size="sm"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            disabled={!isConnected || !canPushToTalk}
            className={cn(
              "h-8 text-xs flex items-center px-4 py-2 rounded-full transition-all duration-300 shine",
              isRecording ? "text-white hover:opacity-90" : "hover:opacity-90"
            )}
            style={
              isRecording
                ? {
                    backgroundColor: secondaryColor,
                    color: 'white',
                  }
                : {
                    borderColor: primaryColor,
                    color: primaryColor,
                    backgroundColor: 'transparent',
                  }
            }
          >
            <Mic className="h-4 w-4 mr-2" />
            {isRecording ? "Release to Send" : "Push to Talk"}
          </Button>
        )}
      </div>
    </div>
  );
}
