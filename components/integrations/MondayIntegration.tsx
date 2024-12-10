
// components/integrations/MondayIntegration.tsx
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
interface MondaySettings {
  boardId?: string;
  groupId?: string;
  columnMappings?: Record<string, string>;
}

export function MondayIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState<MondaySettings>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch existing integration status and settings
    fetchIntegrationStatus();
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/monday/status');
      const data = await response.json();
      setIsConnected(data.connected);
      setSettings(data.settings || {});
    } catch (error) {
      console.error('Failed to fetch Monday.com status:', error);
    }
  };

  const handleConnect = () => {
    // Redirect to Monday.com OAuth flow
    window.location.href = '/api/auth/monday';
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/integrations/monday/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      toast.success('Monday.com settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-dark-accent-1 border-dark-accent-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/monday.png" alt="Monday.com" className="w-8 h-8" />
            <h3 className="text-lg font-semibold text-white">Monday.com CRM</h3>
          </div>
          {!isConnected && (
            <Button onClick={handleConnect} className="shine">
              Connect Monday.com
            </Button>
          )}
        </div>
      </CardHeader>

      {isConnected && (
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-dream-cyan animate-pulse" />
            <span className="text-white">Connected to Monday.com</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-white mb-2">Board ID</label>
              <Input
                value={settings.boardId || ''}
                onChange={(e) => setSettings(s => ({ ...s, boardId: e.target.value }))}
                placeholder="Enter your Monday.com board ID"
              />
            </div>

            <div>
              <label className="text-sm text-white mb-2">Group ID</label>
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
              Save Settings
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
