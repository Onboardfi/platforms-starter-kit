// lib/db/debug.ts
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

export async function testDatabaseConnection() {
  try {
    // Try a simple query
    const result = await db.select().from(users).limit(1);
    console.log('Database connection test successful:', {
      hasResults: result.length > 0,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Database connection test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return false;
  }
}