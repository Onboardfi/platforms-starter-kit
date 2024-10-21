// /app/api/updateAgentSteps/route.ts

import { NextResponse } from 'next/server';
import { updateAgentStepsWithoutAuth } from '@/lib/actions';
import { Step } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, steps } = body;

    if (!agentId || !Array.isArray(steps)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload.' },
        { status: 400 }
      );
    }

    const formattedSteps: Step[] = steps.map((step) => ({
      title: step.title,
      description: step.description,
      completionTool: step.completionTool,
      completed: step.completed ?? false,
    }));

    const result = await updateAgentStepsWithoutAuth(agentId, formattedSteps);

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