import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { users, usageLogs } from '@/lib/schema';
import Stripe from 'stripe';

// Route config
export const runtime = 'edge';
export const dynamic = 'force-dynamic'; 
export const preferredRegion = 'auto';

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
 if (!subscription.customer) return;
 
 await db
   .update(users)
   .set({ stripeSubscriptionId: subscription.id })
   .where(eq(users.stripeCustomerId, subscription.customer as string));
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
 if (!invoice.customer) return;

 await db
   .update(usageLogs)
   .set({
     reportingStatus: 'reported',
     stripeEventId: invoice.id
   })
   .where(eq(usageLogs.stripeCustomerId, invoice.customer as string));
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
 if (!invoice.customer) return;

 const user = await db.query.users.findFirst({
   where: eq(users.stripeCustomerId, invoice.customer as string)
 });

 if (user) {
   // Add failed payment handling logic here
   console.error('Payment failed for user:', user.id);
 }
}

export async function POST(req: NextRequest) {
 try {
   const body = await req.text();
   const signature = headers().get('stripe-signature');

   if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
     return new NextResponse('Missing webhook config', { status: 400 });
   }

   const event = stripe.webhooks.constructEvent(
     body,
     signature,
     process.env.STRIPE_WEBHOOK_SECRET
   );

   switch (event.type) {
     case 'customer.subscription.created':
     case 'customer.subscription.updated':
     case 'customer.subscription.deleted':
       await handleSubscriptionChange(event.data.object as Stripe.Subscription);
       break;

     case 'invoice.paid':
       await handleInvoicePaid(event.data.object as Stripe.Invoice);
       break;

     case 'invoice.payment_failed':
       await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
       break;

     case 'payment_intent.succeeded':
     case 'charge.succeeded':
       console.log(`${event.type}:`, event.data.object.id);
       break;
   }

   return NextResponse.json({ received: true });
   
 } catch (err) {
   console.error('Webhook error:', err);
   return NextResponse.json(
     { error: err instanceof Error ? err.message : 'Unknown error' },
     { status: 400 }
   );
 }
}