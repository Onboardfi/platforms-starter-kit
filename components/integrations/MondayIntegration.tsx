//Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/integrations/MondayIntegration.tsx
import React from 'react';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface MondaySettings {
  boardId?: string;
  groupId?: string;
  columnMappings?: Record<string, string>;
}

const MondayIntegration = () => {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState<MondaySettings>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.organizationId) {
      fetchIntegrationStatus();
    }
  }, [status, session]);

  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/monday/status', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.organizationId && {
            'x-organization-id': session.organizationId as string
          })
        }
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          setIsConnected(false);
          throw new Error('Please sign in to configure Monday.com integration');
        }
        throw new Error(error.error || 'Failed to fetch status');
      }

      const data = await response.json();
      setIsConnected(data.connected);
      setSettings(data.settings || {});
      setError(null);
    } catch (error) {
      console.error('Failed to fetch Monday.com status:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch status');
      setIsConnected(false);
    }
  };

  const handleConnect = () => {
    if (!session?.organizationId) {
      toast.error('Please select an organization first');
      return;
    }
    // Store current URL to return after authentication
    localStorage.setItem('mondayAuthRedirect', window.location.href);
    window.location.href = '/api/auth/monday';
  };

  const handleSaveSettings = async () => {
    if (!session?.organizationId) {
      toast.error('Please select an organization first');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/integrations/monday/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': session.organizationId as string
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          if (data.requiresAuth) {
            setIsConnected(false);
            // Store current settings in localStorage
            localStorage.setItem('mondayPendingSettings', JSON.stringify(settings));
            handleConnect();
            return;
          }
          throw new Error('Session expired. Please reconnect to Monday.com');
        }
        throw new Error(data.error || 'Failed to save settings');
      }

      await fetchIntegrationStatus();
      toast.success('Monday.com settings saved');
      setError(null);
    } catch (error) {
      console.error('Failed to save settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (error instanceof Error && error.message.includes('Session expired')) {
        setIsConnected(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Restore pending settings after reconnection
  useEffect(() => {
    if (isConnected) {
      const pendingSettings = localStorage.getItem('mondayPendingSettings');
      if (pendingSettings) {
        try {
          const parsed = JSON.parse(pendingSettings);
          setSettings(parsed);
          handleSaveSettings();
          localStorage.removeItem('mondayPendingSettings');
        } catch (e) {
          console.error('Failed to restore pending settings:', e);
        }
      }
    }
  }, [isConnected]);

  if (status === 'loading') {
    return (
      <Card className="bg-dark-accent-1 border-dark-accent-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-dream-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Card className="bg-dark-accent-1 border-dark-accent-2">
        <CardContent className="p-6">
          <div className="text-white text-center">
            Please sign in to configure Monday.com integration
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session?.organizationId) {
    return (
      <Card className="bg-dark-accent-1 border-dark-accent-2">
        <CardContent className="p-6">
          <div className="text-white text-center">
            Please select an organization to configure Monday.com integration
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-accent-1 border-dark-accent-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/monday.png" alt="Monday.com" className="w-8 h-8" />
            <h3 className="text-lg font-semibold text-white">Monday.com CRM</h3>
          </div>
          <Button 
            onClick={handleConnect} 
            className={`shine ${!isConnected ? 'bg-dream-cyan' : ''}`}
          >
            {isConnected ? 'Reconnect' : 'Connect Monday.com'}
          </Button>
        </div>
      </CardHeader>

      {error && (
        <div className="px-6 py-2 text-red-500 text-sm">
          {error}
        </div>
      )}

      {isConnected && (
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-dream-cyan animate-pulse" />
            <span className="text-white">Connected to Monday.com</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-white mb-2 block">Board ID</label>
              <Input
                value={settings.boardId || ''}
                onChange={(e) => setSettings(s => ({ ...s, boardId: e.target.value }))}
                placeholder="Enter your Monday.com board ID"
              />
            </div>

            <div>
              <label className="text-sm text-white mb-2 block">Group ID</label>
              <Input
                value={settings.groupId || ''}
                onChange={(e) => setSettings(s => ({ ...s, groupId: e.target.value }))}
                placeholder="Enter your Monday.com group ID (default: leads)"
              />
            </div>

            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full mt-4"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export { MondayIntegration };