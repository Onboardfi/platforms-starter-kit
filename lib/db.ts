// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const connectionString = process.env.DATABASE_URL;

// Create postgres connection with proper SSL config
const sql = postgres(connectionString, {
  ssl: {
    rejectUnauthorized: false // Allows self-signed certificates from Supabase
  },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

// Create drizzle database instance
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development' 
});

// Export default for backwards compatibility
export default db;
export type DrizzleClient = typeof db;

// Add a health check function with proper error handling
export async function checkDatabaseConnection(): Promise<{ connected: boolean; timestamp?: Date; error?: Error }> {
  try {
    const result = await sql<[{ now: Date }]>`SELECT NOW()`;
    return { connected: true, timestamp: result[0]?.now };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown database error');
    console.error('Database connection check failed:', err);
    return { connected: false, error: err };
  }
}