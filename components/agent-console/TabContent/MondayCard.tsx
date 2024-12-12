import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MondayCard = () => {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.organizationId) {
      checkConnectionStatus();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, session]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/integrations/monday/status', {
        credentials: 'include'
      });

      if (response.status === 401) {
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to check connection status');
      }

      const data = await response.json();
      setIsConnected(data.connected);
      setError(null);
    } catch (error) {
      console.error('Failed to check Monday.com status:', error);
      setError(error instanceof Error ? error.message : 'Failed to check status');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (status === 'unauthenticated') {
      // Store intended action for post-login
      localStorage.setItem('post_login_action', 'connect_monday');
      signIn();
      return;
    }

    if (!session?.organizationId) {
      toast.error('Please select an organization first');
      return;
    }

    try {
      // Initiate Monday.com OAuth flow
      window.location.href = '/api/auth/monday';
    } catch (error) {
      console.error('Failed to initiate Monday.com connection:', error);
      toast.error('Failed to connect to Monday.com');
    }
  };

  const cardContent = (
    <div className="flex items-start space-x-4">
      <div className={cn(
        "w-16 h-16 rounded-2xl",
        "bg-neutral-800/50",
        "border border-white/10",
        "flex items-center justify-center",
        "flex-shrink-0 relative overflow-hidden",
        "group-hover:border-white/20",
        "transition-all duration-300",
        "shine shadow-dream"
      )}>
        <img
          src="/monday.png"
          alt="Monday.com logo"
          className="object-contain p-2"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-light text-white/90">
            Monday.com
          </h3>
          
          {isConnected && (
            <span className={cn(
              'px-3 py-1',
              'text-[10px] font-light',
              'rounded-full',
              'border backdrop-blur-md',
              'transition-all duration-300',
              'animate-dream-fade-up',
              'shadow-dream-sm shine',
              'bg-dream-cyan/10 border-dream-cyan/20 text-dream-cyan'
            )}>
              Connected
            </span>
          )}
        </div>
        
        <p className="mt-2 text-xs font-light text-white/50 leading-relaxed">
          Create and manage leads directly in your Monday.com CRM boards.
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="group relative animate-dream-fade-up">
        <div className={cn(
          "relative rounded-3xl overflow-hidden",
          "bg-neutral-900/50 backdrop-blur-md",
          "border border-white/10",
          "transition-all duration-300",
          "hover:border-white/20",
          "shadow-dream hover:shadow-dream-lg"
        )}>
          <div className="relative p-6 flex flex-col h-full shine">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 border border-white/10 flex items-center justify-center animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/20" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-4 bg-white/20 rounded animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative animate-dream-fade-up">
      <div className={cn(
        "relative rounded-3xl overflow-hidden",
        "bg-neutral-900/50 backdrop-blur-md",
        "border border-white/10",
        "transition-all duration-300",
        "hover:border-white/20",
        "shadow-dream hover:shadow-dream-lg"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-dream-pink/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative p-6 flex flex-col h-full shine">
          {cardContent}

          {error && (
            <div className="mt-4 text-xs text-red-400">
              {error}
            </div>
          )}

          {status === 'unauthenticated' && (
            <div className="mt-4 text-xs text-white/50">
              Please sign in to use Monday.com integration
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleConnect}
              variant={isConnected ? "destructive" : "outline"}
              className={cn(
                "flex-1 rounded-xl",
                "text-xs font-light h-9",
                "transition-all duration-300",
                "shine shadow-dream",
                isConnected 
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {isConnected ? 'Disconnect' : 'Connect Monday.com'}
            </Button>
            
            {isConnected && (
              <Button
                variant="outline"
                className={cn(
                  "w-20 rounded-xl",
                  "text-xs font-light h-9",
                  "bg-white/5 border-white/10",
                  "text-white/70",
                  "hover:bg-white/10 hover:border-white/20",
                  "transition-all duration-300",
                  "shine shadow-dream"
                )}
                onClick={() => {/* Add settings handler */}}
              >
                Settings
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MondayCard;