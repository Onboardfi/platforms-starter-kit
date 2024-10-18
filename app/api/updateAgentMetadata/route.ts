// /app/api/updateAgentMetadata/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateAgentMetadata } from '@/lib/actions';
import { UpdateAgentMetadataResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<UpdateAgentMetadataResponse>> {
  const session = await getSession();

  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { agentId, ...data } = body;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agentId is required.' },
        { status: 400 }
      );
    }

    // Call updateAgentMetadata with agentId and data
    const result = await updateAgentMetadata(agentId, data);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in updateAgentMetadata API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}