//Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/api/auth/[...nextauth]/route.ts

import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import db from '@/lib/db';
import { users, organizations } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// We only need the minimal handler here since we've moved all the logic to auth.ts
const handler = NextAuth(authOptions);

/**
 * This helper ensures we always set user metadata safely
 */
async function safeUpdateUserMetadata(userId: string, metadata: any) {
  try {
    await db.update(users)
      .set({ 
        metadata: metadata 
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Failed to update user metadata:', error);
  }
}

export { handler as GET, handler as POST };