
"use client";
// components/WebSocketClient.tsx



import React, { useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { AlertCircle, Check, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WebSocketMessage {
  type: string;
  message?: string;
  event_id?: string;
  session?: Record<string, any>;
  [key: string]: any;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8081/';

const WebSocketClient = () => {
  const {
    sendMessage,
    lastMessage,
    readyState,
    getWebSocket,
  } = useWebSocket<WebSocketMessage>(WEBSOCKET_URL, {
    onOpen: () => console.log('WebSocket connection established'),
    onClose: () => console.log('WebSocket connection closed'),
    onError: (event) => console.error('WebSocket error:', event),
    shouldReconnect: (closeEvent) => true, // Automatically reconnect on all close events
    reconnectAttempts: 10, // Number of reconnection attempts before giving up
    reconnectInterval: 3000, // Reconnect every 3 seconds
  });

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Connected',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Disconnected',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  const handleSendMessage = useCallback(() => {
    const testMessage: WebSocketMessage = {
      type: 'test.message',
      message: 'Hello from client',
    };
    sendMessage(JSON.stringify(testMessage));
    console.log('Test message sent:', testMessage);
  }, [sendMessage]);

  return (
    <div className="space-y-4 p-4 bg-neutral-900 rounded-lg">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {readyState === ReadyState.OPEN ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        <span className="font-medium text-white">
          Status: {connectionStatus}
        </span>
      </div>

      {/* Send Test Message Button */}
      <button
        onClick={handleSendMessage}
        disabled={readyState !== ReadyState.OPEN}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Send Test Message
      </button>

      {/* Error Handling */}
      {readyState === ReadyState.CLOSED && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Disconnected</AlertTitle>
          <AlertDescription>
            WebSocket connection has been closed. Attempting to reconnect...
          </AlertDescription>
        </Alert>
      )}

      {/* Received Messages */}
      {lastMessage && (
        <div className="bg-neutral-800 p-3 rounded mt-4">
          <div className="text-sm text-neutral-400">Type: {lastMessage.data.type}</div>
          <pre className="mt-2 text-sm overflow-x-auto text-white">
            {JSON.stringify(lastMessage.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default WebSocketClient;
