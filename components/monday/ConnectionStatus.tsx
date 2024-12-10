// components/monday/ConnectionStatus.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  onConnect: () => void;
  lastUpdated?: Date;
}

export function MondayConnectionStatus({ 
  isConnected, 
  onConnect,
  lastUpdated 
}: ConnectionStatusProps) {
  return (
    <Card className="bg-dark-accent-1 border-dark-accent-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-dream-cyan animate-pulse' : 'bg-dark-accent-3'
            }`}
          />
          <span className="text-sm text-white font-mono">
            {isConnected ? 'Connected to Monday.com' : 'Not Connected'}
          </span>
          {isConnected && lastUpdated && (
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleDateString()}
            </span>
          )}
        </div>
        
        {!isConnected && (
          <Button 
            onClick={onConnect}
            className="bg-dream-blue hover:bg-dream-blue/90 text-black"
          >
            Connect Monday.com
          </Button>
        )}
      </div>
    </Card>
  );
}
