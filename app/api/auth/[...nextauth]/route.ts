import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { users, organizations, organizationMemberships } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Stripe price IDs for organization-level billing
const INPUT_TOKENS_PRICE_ID = 'price_1QNCt3AvXC0YI9f3iwhykoq2';
const OUTPUT_TOKENS_PRICE_ID = 'price_1QND7AAvXC0YI9f3VlOttETG';

interface SetupError {
  setupError: boolean;
  errorTimestamp: string;
  requiresRetry: boolean;
}

const handler = NextAuth({
  ...authOptions,
  events: {
    async createUser({ user }) {
      try {
        // Start a transaction to ensure all operations succeed or fail together
        await db.transaction(async (tx) => {
          // Create default organization
          const [organization] = await tx
            .insert(organizations)
            .values({
              id: createId(),
              name: `${user.name || 'My'}'s Organization`,
              slug: `org-${createId()}`,
              createdBy: user.id,
            })
            .returning();

          // Create owner membership
          await tx
            .insert(organizationMemberships)
            .values({
              id: createId(),
              organizationId: organization.id,
              userId: user.id,
              role: 'owner',
            });

          // Create Stripe customer for the organization
          const customer = await stripe.customers.create({
            email: user.email!,
            metadata: {
              organizationId: organization.id,
              userId: user.id,
            },
            name: organization.name,
          });

          // Update organization with Stripe customer ID
          await tx
            .update(organizations)
            .set({ 
              stripeCustomerId: customer.id,
            })
            .where(eq(organizations.id, organization.id));

          // Create subscription with both prices
          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
              {
                price: INPUT_TOKENS_PRICE_ID,
              },
              {
                price: OUTPUT_TOKENS_PRICE_ID,
              },
            ],
            payment_behavior: 'default_incomplete',
            collection_method: 'charge_automatically',
            metadata: {
              organizationId: organization.id,
            },
          });

          // Update organization with subscription ID
          await tx
            .update(organizations)
            .set({ 
              stripeSubscriptionId: subscription.id,
            })
            .where(eq(organizations.id, organization.id));

          console.log('Created organization and Stripe setup:', {
            userId: user.id,
            organizationId: organization.id,
            customerId: customer.id,
            subscriptionId: subscription.id,
          });
        });
      } catch (error) {
        console.error('Error in user creation process:', error);
        
        // Log detailed error for debugging
        console.error('Failed to setup user, organization, and billing:', {
          userId: user.id,
          email: user.email,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
          } : error,
          timestamp: new Date().toISOString(),
        });

        // Mark user for retry using the metadata field
        const errorMetadata: SetupError = {
          setupError: true,
          errorTimestamp: new Date().toISOString(),
          requiresRetry: true,
        };

        await db
          .update(users)
          .set({ 
            metadata: errorMetadata,
          })
          .where(eq(users.id, user.id));

        // You might want to trigger an alert or notification here
        // await notifyAdminsOfFailedSetup(user.id, error);
      }
    },

    async signIn({ user }) {
      try {
        // Check if user needs retry of organization setup
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          with: {
            organizationMemberships: true,
          },
        });

        const userMetadata = dbUser?.metadata as SetupError | undefined;
        
        if (userMetadata?.requiresRetry && !dbUser?.organizationMemberships?.length) {
          // Implement retry logic here if needed
          console.log('User requires retry of organization setup:', user.id);
          // await retryUserSetup(user.id);
        }
      } catch (error) {
        console.error('Error checking user setup status:', error);
      }
    },
  },
});

export { handler as GET, handler as POST };