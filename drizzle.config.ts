///Users/bobbygilbert/Documents/Github/platforms-starter-kit/drizzle.config.ts
import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRES_HOST || "aws-0-us-east-1.pooler.supabase.com",
    user: process.env.POSTGRES_USER || "postgres.ulvyhwjieyyttllrlbxx",
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE || "postgres",
    ssl: {
      rejectUnauthorized: false // This will allow self-signed certificates
    },
    port: 6543
  },
  verbose: true,
  strict: true,
  entities: {
    roles: {
      provider: 'supabase'
    }
  },
});