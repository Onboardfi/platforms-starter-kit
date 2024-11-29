//Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/StripePricingTable.tsx

'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        'pricing-table-id': string;
        'publishable-key': string;
        'customer-session-client-secret': string;
        'client-reference-id'?: string;
        'subscription'?: string;
      };
    }
  }
}

interface StripePricingTableProps {
  customerSessionClientSecret: string;
  baseSubscriptionId?: string;
  customerId?: string;
}

const StripePricingTable: React.FC<StripePricingTableProps> = ({
  customerSessionClientSecret,
  baseSubscriptionId,
  customerId,
}) => {
  useEffect(() => {
    console.log('Mounting StripePricingTable with:', {
      session: customerSessionClientSecret,
      subscription: baseSubscriptionId,
      customer: customerId
    });

    // Listen for Stripe events
    const handleStripeEvent = (event: Event) => {
      console.log('Stripe Event:', event);
    };

    window.addEventListener('stripe-event', handleStripeEvent);

    return () => {
      window.removeEventListener('stripe-event', handleStripeEvent);
      console.log('Unmounting StripePricingTable');
    };
  }, [customerSessionClientSecret, baseSubscriptionId, customerId]);

  const handleScriptLoad = () => {
    console.log('Stripe script loaded successfully');
  };

  const handleScriptError = (error: Error) => {
    console.error('Failed to load Stripe script:', error);
  };

  console.log('Rendering StripePricingTable with:', {
    hasSession: !!customerSessionClientSecret,
    hasSubscription: !!baseSubscriptionId,
    hasCustomer: !!customerId
  });

  return (
    <>
      <Script 
        src="https://js.stripe.com/v3/pricing-table.js" 
        async 
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />

      <stripe-pricing-table
        pricing-table-id="prctbl_1QPsBCAvXC0YI9f3NdjsFCVi"
        publishable-key="pk_test_51OqmZsAvXC0YI9f3qMpheIGPUoO1CztIF5rfUBeqSGtmXnGLQgbv1JzKS5tiOtkdamwOAH7rsOUKjLQWOCUxoEZN00dJbTNkzT"
        customer-session-client-secret={customerSessionClientSecret}
        client-reference-id={customerId}
        subscription={baseSubscriptionId}
      />
    </>
  );
};
export default StripePricingTable;
