// lib/stripe/get-session.ts
import { stripe } from '@/lib/stripe';

export async function getStripeSession({ 
  customerId,
  returnUrl 
}: { 
  customerId: string;
  returnUrl: string;
}) {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}