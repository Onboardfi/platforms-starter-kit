// app/api/updateSessionSteps/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { onboardingSessions, type Step, type StepProgress } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redis, getSessionState, updateSessionState } from '@/lib/upstash';
import { createId } from "@paralleldrive/cuid2";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, completionTool, completed } = await req.json();
    
    console.log('Updating step status request:', {
      sessionId,
      completionTool,
      completed,
      timestamp: new Date().toISOString()
    });

    // First get the Redis state since it should have the complete steps
    const redisState = await getSessionState(sessionId);
    
    // Then fetch the session from PostgreSQL
    const dbSession = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId),
      with: {
        agent: {
          columns: {
            settings: true
          }
        }
      }
    });

    if (!dbSession) {
      console.error('Session not found:', sessionId);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Use Redis steps if available, fall back to DB steps, then agent settings steps
    let currentSteps = redisState?.steps || 
                      (dbSession.stepProgress as StepProgress)?.steps ||
                      (dbSession.agent?.settings.steps || []).map(step => ({
                        ...step,
                        id: createId(),
                        completed: false
                      }));

    console.log('Current steps before update:', currentSteps);

    // Map over the steps and update the matching one
    const updatedSteps = currentSteps.map(step => {
      // Ensure step has all required properties
      const baseStep = {
        id: step.id || createId(),
        title: step.title || '',
        description: step.description || '',
        completionTool: step.completionTool,
        completed: step.completed || false,
        completedAt: step.completedAt
      };

      // Only update the matching step
      if (step.completionTool === completionTool) {
        return {
          ...baseStep,
          completed: completed,
          completedAt: completed ? new Date().toISOString() : undefined
        };
      }
      return baseStep;
    });

    // Log if no matching step was found
    if (!updatedSteps.some(step => step.completionTool === completionTool)) {
      console.warn('No matching step found for tool:', completionTool);
      // Create a new step if none exists for this tool
      updatedSteps.push({
        id: createId(),
        title: `${completionTool} Step`,
        description: `Step for ${completionTool} completion`,
        completionTool,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined
      });
    }

    console.log('Steps after update:', updatedSteps);

    // Create the new step progress object
    const newStepProgress: StepProgress = {
      steps: updatedSteps
    };

    // Update PostgreSQL
    const [updatedSession] = await db.update(onboardingSessions)
      .set({ 
        stepProgress: newStepProgress,
        lastInteractionAt: new Date()
      })
      .where(eq(onboardingSessions.id, sessionId))
      .returning();

    console.log('Updated session in database:', {
      sessionId: updatedSession.id,
      updatedStepProgress: updatedSession.stepProgress
    });

    // Update Redis state
    if (redisState) {
      await updateSessionState(sessionId, {
        ...redisState,
        steps: updatedSteps,
        lastActive: Date.now()
      });
      console.log('Updated Redis state with new steps');
    }

    // Notify about the update
    await redis.publish('session-updates', {
      type: 'step-completed',
      sessionId,
      completionTool,
      completed,
      timestamp: Date.now(),
      steps: updatedSteps
    });

    return NextResponse.json({ 
      success: true,
      stepProgress: newStepProgress
    });

  } catch (error) {
    console.error('Failed to update session steps:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: "Failed to update session steps",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}