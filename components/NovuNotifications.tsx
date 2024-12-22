// components/NovuNotifications.tsx
"use client"

import React, { useCallback, useEffect } from 'react';
import {
  NovuProvider,
  PopoverNotificationCenter,
  IMessage,
  INovuProviderProps,
  INotificationBellProps
} from "@novu/notification-center";
import { Bell } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ITab } from '@novu/notification-center/dist/types/shared/interfaces';
import type { ITranslationContent } from '@novu/notification-center/dist/types/i18n/lang';

// Define component props
interface NovuNotificationsProps {
  subscriberId?: string;
  applicationIdentifier?: string;
}

// Define translations
const translations: Partial<ITranslationContent> = {
  markAllAsRead: 'Mark all as read',
  notifications: 'Notifications',
  settings: 'Settings',
  removeMessage: 'Remove message',
  markAsRead: 'Mark as read',
  poweredBy: 'Powered by'
};

// NotificationBell component
const NotificationBell = ({ unseenCount = 0 }: { unseenCount?: number }) => {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.02] bg-neutral-800/50 text-neutral-400 transition-all duration-200 hover:bg-neutral-800 hover:text-white">
      <Bell className="h-4 w-4" />
      {unseenCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-medium text-white">
          {unseenCount}
        </span>
      )}
    </div>
  );
};

// Main component
const NovuNotifications = ({ 
  subscriberId,
  applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID
}: NovuNotificationsProps) => {

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        console.log('Fetching notifications for subscriber:', subscriberId);
        
        const response = await fetch(`https://api.novu.co/v1/notifications/feed`, {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${applicationIdentifier}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'subscriber-id': subscriberId || ''
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Notifications feed:', data);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    if (subscriberId) {
      fetchNotifications();
    }
  }, [subscriberId, applicationIdentifier]);

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      if (!subscriberId) return;

      try {
        ws = new WebSocket(`wss://ws.novu.co/socket.io/?subscriberId=${subscriberId}`);
        
        ws.onopen = () => {
          console.log('WebSocket connected for subscriber:', subscriberId);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [subscriberId]);

  // Early return if missing required props
  if (!subscriberId || !applicationIdentifier) {
    console.warn('Missing required props:', { subscriberId, applicationIdentifier });
    return null;
  }

  // Handle notification clicks
  const handleNotificationClick = useCallback((message: IMessage) => {
    console.log('Notification clicked:', message);
    
    const ctaUrl = message.cta?.data?.url || message.payload?.url;
    if (ctaUrl && typeof ctaUrl === 'string') {
      window.location.href = ctaUrl;
    }
  }, []);

  // Define tabs
  const tabs: ITab[] = [
    { name: 'All', storeId: 'all' },
    { name: 'Tasks', storeId: 'tasks' },
    { name: 'Team', storeId: 'team' }
  ];

  // Popover configuration
  const popoverConfig = {
    offset: 12,
    position: 'bottom-end' as const,
    theme: {
      container: 'border border-white/[0.02] bg-neutral-900/80 backdrop-blur-md rounded-xl shadow-dream overflow-hidden',
      header: 'border-b border-white/[0.02] bg-neutral-900/80 p-4',
      footer: 'border-t border-white/[0.02] bg-neutral-900/80 p-4',
      scrollContainer: 'max-h-[400px]',
      notification: {
        item: 'border-b border-white/[0.02] hover:bg-neutral-800/50 transition-colors duration-200 p-4',
        title: 'text-white font-medium',
        content: 'text-neutral-400'
      }
    }
  };

  // Provider configuration
  const providerConfig: INovuProviderProps = {
    subscriberId,
    applicationIdentifier,
    initialFetchingStrategy: {
      fetchNotifications: true,
      fetchUserPreferences: true
    },
    i18n: {
      lang: "en",
      translations
    },
    stores: tabs.map(tab => ({
      storeId: tab.storeId,
      query: {
        limit: 10
      }
    })),
    backendUrl: 'https://api.novu.co',
    socketUrl: 'wss://ws.novu.co'
  };

  return (
    <NovuProvider {...providerConfig}>
      <PopoverNotificationCenter
        colorScheme="dark"
        position={popoverConfig.position}
        offset={popoverConfig.offset}
        tabs={tabs}
        onNotificationClick={handleNotificationClick}
        showUserPreferences={false}
      >
        {(props: INotificationBellProps) => {
          console.log('Rendering bell with props:', props);
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="outline-none">
                  <NotificationBell unseenCount={props.unseenCount} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {props.unseenCount && props.unseenCount > 0 
                  ? `${props.unseenCount} new notifications` 
                  : 'Notifications'
                }
              </TooltipContent>
            </Tooltip>
          );
        }}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
};

export default NovuNotifications;