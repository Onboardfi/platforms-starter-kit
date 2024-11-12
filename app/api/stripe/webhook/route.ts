import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { users } from '@/lib/schema';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Webhook Error', { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return new NextResponse('Webhook Error', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await db
          .update(users)
          .set({ 
            stripeSubscriptionId: subscription.id,
          })
          .where(eq(users.stripeCustomerId, subscription.customer as string));
        break;
        
      case 'invoice.paid':
        // Handle successful payment
        break;
        
      case 'invoice.payment_failed':
        // Handle failed payment
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Webhook handler failed', { status: 400 });
  }
}

export const runtime = 'edge';