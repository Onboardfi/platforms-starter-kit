//Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { users, usageLogs } from '@/lib/schema';
import Stripe from 'stripe';

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  try {
    if (!subscription.customer) return;
    
    // Update user subscription status
    await db
      .update(users)
      .set({
        stripeSubscriptionId: subscription.id,
        // Add additional subscription metadata if needed
      })
      .where(eq(users.stripeCustomerId, subscription.customer as string));

    console.log('Updated subscription for customer:', subscription.customer);
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    if (!invoice.customer) return;

    // Update usage logs to mark them as reported
    await db
      .update(usageLogs)
      .set({
        reportingStatus: 'reported',
        stripeEventId: invoice.id
      })
      .where(eq(usageLogs.stripeCustomerId, invoice.customer as string));

    console.log('Marked usage logs as reported for invoice:', invoice.id);
  } catch (error) {
    console.error('Error processing paid invoice:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (!invoice.customer) return;

    // Optional: Update user status or send notification
    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, invoice.customer as string)
    });

    if (user) {
      // Implement your failed payment handling logic here
      console.log('Payment failed for user:', user.id);
    }
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing webhook signature or secret');
      return new NextResponse('Webhook configuration error', { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err);
      return new NextResponse(
        `Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`, 
        { status: 400 }
      );
    }

    console.log('Received Stripe webhook event:', event.type);

    // Handle different event types
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

      // Add handlers for other webhook events as needed
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        break;

      case 'charge.succeeded':
        console.log('Charge succeeded:', event.data.object.id);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we need the raw body for signature verification
  },
};

// Use edge runtime if you want faster response times
export const runtime = 'edge';