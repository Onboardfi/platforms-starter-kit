// First, update the imports at the top of the file
import { getGradient } from '@/lib/gradients';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Mic, X, Zap } from 'lucide-react';

// Define the Toast component's props interface
interface ToastProps {
  username?: string;
  isConnected: boolean;
  isRecording: boolean;
  canPushToTalk: boolean;
  connectConversation: () => Promise<void>;
  disconnectConversation: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  changeTurnEndType: (value: string) => Promise<void>;
}

// Create the Toast component
const Toast: React.FC<ToastProps> = ({
  username,
  isConnected,
  isRecording,
  canPushToTalk,
  connectConversation,
  disconnectConversation,
  startRecording,
  stopRecording,
  changeTurnEndType
}) => {
  return (
    <div
      className={`rounded-[16px] ${getGradient(
        username
      )} w-11/12 sm:w-[581px] h-auto p-0.5 fixed z-10 bottom-10 left-0 right-0 mx-auto`}
    >
      <div className="rounded-[14px] w-full h-full bg-[#111111] flex flex-row items-center justify-between p-4 space-x-4">
        {/* Connect/Disconnect Button */}
        <Button
          variant={isConnected ? "outline" : "default"}
          onClick={isConnected ? disconnectConversation : connectConversation}
          className="h-[40px] font-mono border border-[#333333] hover:border-white"
          size="sm"
        >
          {isConnected ? (
            <X className="mr-2 h-4 w-4" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          {isConnected ? "Disconnect" : "Connect"}
        </Button>

        {/* Manual/VAD Switch */}
        <div className="flex items-center space-x-2">
          <Switch
            checked={!canPushToTalk}
            onCheckedChange={(checked) => 
              changeTurnEndType(checked ? "server_vad" : "none")
            }
          />
          <span className="text-sm text-gray-400 font-mono whitespace-nowrap">
            {canPushToTalk ? "Manual" : "VAD"}
          </span>
        </div>

        {/* Push to Talk Button */}
        {isConnected && canPushToTalk && (
          <Button
            variant={isRecording ? "destructive" : "outline"}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            disabled={!isConnected || !canPushToTalk}
            className="h-[40px] font-mono border border-[#333333] hover:border-white"
            size="sm"
          >
            <Mic className="mr-2 h-4 w-4" />
            {isRecording ? "Release" : "Push to Talk"}
          </Button>
        )}

        {/* Optional Visualizations Container */}
        <div className="flex-1 max-w-[200px] h-8">
          <div className="grid grid-cols-2 gap-2 h-full">
            <canvas className="w-full h-full" />
            <canvas className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
