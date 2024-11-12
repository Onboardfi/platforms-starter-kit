// scripts/setupStripeProduct.ts
import { stripe } from '../lib/stripe';

async function setupMeteredProduct() {
  try {
    // 1. Create a product
    const product = await stripe.products.create({
      name: 'AI Assistant Usage',
    });

    console.log('Product created:', product.id);

    // 2. Create a price for the product
    const price = await stripe.prices.create({
      currency: 'usd',
      product: product.id,
      unit_amount: 10, // 10 cents per unit
      recurring: {
        interval: 'month',
        usage_type: 'metered',
      },
      billing_scheme: 'per_unit',
      transform_quantity: {
        divide_by: 30, // Charge per 30 seconds
        round: 'up',
      },
    });

    console.log('Price created:', price.id);
  } catch (error) {
    console.error('Error setting up metered product:', error);
  }
}

setupMeteredProduct();
