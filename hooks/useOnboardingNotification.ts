// hooks/useOnboardingNotification.ts
//hooks/useOnboardingNotification.ts

import { useCallback } from 'react';
// hooks/useOnboardingNotification.ts
export function useOnboardingNotification() {
    const sendCompletionNotification = useCallback(async ({
      sessionId,
      agentId, // Add this
      agentName,
      totalSteps
    }: {
      sessionId: string;
      agentId: string;  // Add this
      agentName: string;
      totalSteps: number;
    }) => {
      try {
        console.log('Sending notification for completion:', { sessionId, agentId, agentName, totalSteps });
        
        const response = await fetch(`/api/notifications/onboarding-complete?agentId=${agentId}`, { // Add query param
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-agent-id': agentId, // Add header too for redundancy
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId,
            agentName,
            totalSteps
          }),
        });
  
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to send notification');
        }
  
        const data = await response.json();
        console.log('Notification sent successfully:', data);
        return data;
      } catch (error) {
        console.error('Error sending completion notification:', error);
        throw error;
      }
    }, []);
  
    return { sendCompletionNotification };
  }