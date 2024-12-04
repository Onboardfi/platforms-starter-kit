///Users/bobbygilbert/Documents/Github/platforms-starter-kit/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./schema";

// For Supabase transaction pooling mode
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { 
  ssl: {
    rejectUnauthorized: false
  },
  prepare: false,
  max: 1
});

const db = drizzle(client, { schema });

export default db;
export type DrizzleClient = typeof db;