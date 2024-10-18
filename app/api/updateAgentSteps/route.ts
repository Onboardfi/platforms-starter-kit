// app/api/updateAgentSteps/route.ts

import { NextResponse } from 'next/server';
import { updateAgentMetadata } from '@/lib/actions';
import { Step, UpdateAgentMetadataResponse } from '@/lib/types'; // **Import necessary types**

/**
 * **Update Agent Steps API Route**
 * Handles updating the steps of an agent.
 * This is for Next.js App Router.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, settings } = body;

    // Validate agentId and settings
    if (!agentId || !settings || !Array.isArray(settings.steps)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload.' },
        { status: 400 }
      );
    }

    // Cast steps to Step[] with type safety
    const steps: Step[] = settings.steps;

    const data = { steps };

    // Update agent metadata
    const result: UpdateAgentMetadataResponse = await updateAgentMetadata(agentId, data);

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in updateAgentSteps API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
