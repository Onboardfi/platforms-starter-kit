import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql", // Change from driver to dialect
  dbCredentials: {
    host: process.env.POSTGRES_HOST || "aws-0-us-east-1.pooler.supabase.com",
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE || "postgres",
    ssl: {
      rejectUnauthorized: false
    },
    port: 6543
  },
  verbose: true,
  strict: true
}) satisfies Config;