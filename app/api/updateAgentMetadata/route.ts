import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateAgentMetadata } from '@/lib/actions';
import { UpdateAgentMetadataResponse } from '@/lib/types';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { getBlurDataURL } from '@/lib/utils';

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
    const key = formData.get("key") as string;

    if (!agentId || !key) {
      return NextResponse.json(
        { success: false, error: "agentId and key are required." },
        { status: 400 }
      );
    }

    const result = await updateAgentMetadata(formData, agentId, key);

    return NextResponse.json({
      success: result.success ?? true,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Error in updateAgentMetadata API route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}