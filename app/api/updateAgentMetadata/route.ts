import { NextRequest, NextResponse } from 'next/server';
import { updateAgent } from '@/lib/actions';
import { getSession } from '@/lib/auth';
import { SelectAgent } from '@/lib/schema';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { agentId, value } = body;

    // Validate input
    if (!agentId || !value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure the agentId in 'value' matches the one provided
    if (value.id !== agentId) {
      return NextResponse.json({ error: 'Agent ID mismatch' }, { status: 400 });
    }

    // Call the updateAgent function with the agent data
    const result = await updateAgent(value);

    // Use a type guard to check if 'error' exists on 'result'
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error in updateAgentMetadata API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
