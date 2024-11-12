// scripts/createStripeCustomers.ts

import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, isNull } from 'drizzle-orm';

async function createStripeCustomerForUser(user: typeof users.$inferSelect) {
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      userId: user.id,
    },
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, user.id));

  console.log(`Created Stripe customer for user ${user.id}`);
}

async function main() {
  const usersWithoutStripeId = await db.query.users.findMany({
    where: isNull(users.stripeCustomerId),
  });

  for (const user of usersWithoutStripeId) {
    await createStripeCustomerForUser(user);
  }

  console.log('Stripe customer IDs created for existing users.');
}

main().catch((error) => {
  console.error('Error creating Stripe customers:', error);
});
