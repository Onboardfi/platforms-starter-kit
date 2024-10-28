// /app/api/updateAgentGeneral/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { updateAgentMetadata } from '@/lib/actions';
import { getSession } from '@/lib/auth';
import { UpdateAgentMetadataResponse } from '@/lib/types';

export async function POST(
  request: NextRequest
): Promise<NextResponse<UpdateAgentMetadataResponse>> {
  const session = await getSession();

  if (!session?.user.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const agentId = formData.get("agentId") as string;
    const key = "general"; // Use a specific key for general updates

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: "agentId is required." },
        { status: 400 }
      );
    }

    const result = await updateAgentMetadata(formData, agentId, key);

    return NextResponse.json({
      success: result.success ?? true,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Error in updateAgentGeneral API route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}