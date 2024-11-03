// app/api/updateSessionSteps/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { onboardingSessions, type Step } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redis, getSessionState, updateSessionState } from '@/lib/upstash';
import { createId } from "@paralleldrive/cuid2";

// Define the extended Step type that includes ID
interface StepWithId extends Step {
  id: string;
  completedAt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, completionTool, completed } = await req.json();
    
    // Fetch both PostgreSQL session and Redis state
    const [dbSession, redisState] = await Promise.all([
      db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.id, sessionId)
      }),
      getSessionState(sessionId)
    ]);

    if (!dbSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Initialize stepProgress with steps from either Redis or DB
    const steps = redisState?.steps || dbSession.stepProgress?.steps || [];
    
    const updatedSteps: StepWithId[] = steps.map(step => {
      // Ensure each step has an ID
      const stepId = (step as any).id || createId();
      
      // Create a proper Step object matching schema type
      const newStep: StepWithId = {
        id: stepId,
        title: step.title,
        description: step.description || '',
        completionTool: (step as any).completionTool || null,
        completed: step.completed || false,
        completedAt: step.completedAt
      };

      // Only update the step that matches the completionTool
      if ((step as any).completionTool === completionTool) {
        return {
          ...newStep,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined
        };
      }
      return newStep;
    });

    // Update both PostgreSQL and Redis in parallel
    await Promise.all([
      // Update PostgreSQL
      db.update(onboardingSessions)
        .set({ 
          stepProgress: { steps: updatedSteps },
          lastInteractionAt: new Date()
        })
        .where(eq(onboardingSessions.id, sessionId)),
      
      // Update Redis state if it exists
      redisState && updateSessionState(sessionId, {
        steps: updatedSteps.map(step => ({
          ...step,
          id: step.id, // Ensure ID is included
          completedAt: step.completedAt
        })),
        lastActive: Date.now()
      })
    ]);

    // Publish update event
    await redis.publish('session-updates', {
      type: 'step-completed',
      sessionId,
      completionTool,
      completed,
      timestamp: Date.now()
    });

    return NextResponse.json({ 
      success: true,
      steps: updatedSteps
    });
  } catch (error) {
    console.error('Failed to update session steps:', error);
    return NextResponse.json(
      { error: "Failed to update session steps" }, 
      { status: 500 }
    );
  }
}