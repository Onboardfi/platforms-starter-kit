// lib/webhooks.ts

export interface OnboardingWebhookPayload {
    email: string;
    name?: string;
    organizationName: string;
    companySize: string;
    industry: string;
    siteId?: string;
    metadata?: {
      source?: string;
      needsOnboarding?: boolean;
      role?: string;
      completedAt?: string;
      hasInvite?: boolean;
      [key: string]: any;
    };
  }
  
  export async function sendOnboardingWebhook(payload: OnboardingWebhookPayload): Promise<void> {
    try {
      const response = await fetch('/api/webhooks/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
        }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        console.error('Webhook error response:', error);
        throw new Error(error.error || 'Failed to send webhook');
      }
  
      console.log('Successfully sent onboarding webhook');
    } catch (error) {
      console.error('Failed to send onboarding webhook:', error);
      // Don't throw - we don't want webhook failures to break the flow
    }
  }