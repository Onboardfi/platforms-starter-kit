// /app/api/agents/updatePublishedStatus/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const { agentId, published } = await request.json();

  try {
    const [updatedAgent] = await db
      .update(agents)
      .set({ published })
      .where(eq(agents.id, agentId))
      .returning();

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Error updating agent publish status:', error);
    return NextResponse.error();
  }
}
