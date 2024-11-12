// app/api/auth/[...nextauth]/route.ts

import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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

        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [
            {
              price: 'price_1QKP84AvXC0YI9f3ofIm0gB4', // Replace with your price ID
            },
          ],
        });

        // Update user with Stripe subscription ID
        await db
          .update(users)
          .set({ stripeSubscriptionId: subscription.id })
          .where(eq(users.id, user.id));

        console.log(`Stripe customer and subscription created for user ${user.id}`);
      } catch (error) {
        console.error('Error creating Stripe customer and subscription:', error);
      }
    },
  },
});

export { handler as GET, handler as POST };
