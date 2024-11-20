// lib/stripe-config.ts

export const STRIPE_CONFIG = {
    // Price IDs
    INPUT_TOKENS_PRICE_ID: process.env.STRIPE_INPUT_TOKENS_PRICE_ID!,
    OUTPUT_TOKENS_PRICE_ID: process.env.STRIPE_OUTPUT_TOKENS_PRICE_ID!,
    
    // Rates (in cents per 1K tokens)
    PRICE_PER_1K_INPUT_TOKENS: 1.5,   // $0.015 per 1K tokens
    PRICE_PER_1K_OUTPUT_TOKENS: 2.0,   // $0.020 per 1K tokens
  } as const;