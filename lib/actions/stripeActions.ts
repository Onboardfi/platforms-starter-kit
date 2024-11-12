// lib/actions/stripeActions.ts
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm'; // Add this import

export async function createStripeCustomer(userId: string, email: string) {
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
}
