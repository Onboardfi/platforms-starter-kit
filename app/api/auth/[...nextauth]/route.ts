// app/api/auth/[...nextauth]/route.ts

import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// Get these from your Stripe Dashboard
const INPUT_TOKENS_PRICE_ID = 'price_xxx'; // Price ID for $0.000015 per token
const OUTPUT_TOKENS_PRICE_ID = 'price_xxx'; // Price ID for $0.000020 per token

const handler = NextAuth({
  ...authOptions,
  events: {
    async createUser({ user }) {
      try {
        // Create Stripe customer
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            userId: user.id,
          },
        });

        // Update user with Stripe customer ID
        await db
          .update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, user.id));

        // Create subscription with both prices
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [
            {
              price: INPUT_TOKENS_PRICE_ID,
              // No quantity needed since it's metered billing
            },
            {
              price: OUTPUT_TOKENS_PRICE_ID,
              // No quantity needed since it's metered billing
            },
          ],
          payment_behavior: 'default_incomplete',
          collection_method: 'charge_automatically',
          // Optional: Add trial period
          // trial_period_days: 14,
        });

        // Update user with Stripe subscription ID
        await db
          .update(users)
          .set({ stripeSubscriptionId: subscription.id })
          .where(eq(users.id, user.id));

        console.log(`Stripe customer and subscription created for user ${user.id}`, {
          customerId: customer.id,
          subscriptionId: subscription.id,
          prices: [INPUT_TOKENS_PRICE_ID, OUTPUT_TOKENS_PRICE_ID]
        });
      } catch (error) {
        console.error('Error creating Stripe customer and subscription:', error);
        // You might want to handle this error more gracefully
        // Perhaps mark the user as needing payment setup
      }
    },
  },
});

export { handler as GET, handler as POST };