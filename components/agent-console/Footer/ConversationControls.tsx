//Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/agent-console/Footer/ConversationControls.tsx


import { Button } from '@/components/ui/button';
import { FooterProps } from '../utils/types';
import { X, Zap, Mic } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function ConversationControls({
  isConnected,
  isRecording,
  canPushToTalk,
  connectConversation,
  disconnectConversation,
  startRecording,
  stopRecording,
  changeTurnEndType
}: FooterProps) {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 lg:space-x-6">
      <Button
        variant={isConnected ? "outline" : "default"}
        size="sm"
        onClick={isConnected ? disconnectConversation : connectConversation}
        className="h-8 text-xs flex items-center"
      >
        {isConnected ? <X className="h-4 w-4 mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
        {isConnected ? "Disconnect" : "Connect"}
      </Button>

      <div className="flex items-center space-x-2">
        <Switch
          checked={!canPushToTalk}
          onCheckedChange={(checked) => changeTurnEndType(checked ? "server_vad" : "none")}
        />
        <span className="text-sm text-gray-400 font-mono">
          {canPushToTalk ? "Manual" : "Voice Activity Detection"}
        </span>
      </div>

      {isConnected && canPushToTalk && (
        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="sm"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          disabled={!isConnected || !canPushToTalk}
          className="h-8 text-xs flex items-center"
        >
          <Mic className="h-4 w-4 mr-2" />
          {isRecording ? "Release to Send" : "Push to Talk"}
        </Button>
      )}
    </div>
  );
}
