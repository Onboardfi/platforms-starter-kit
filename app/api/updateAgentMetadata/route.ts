import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateAgentMetadata } from "@/lib/actions";
import { UpdateAgentMetadataResponse } from "@/lib/types";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { getBlurDataURL } from "@/lib/utils";

export async function POST(
  request: NextRequest
): Promise<NextResponse<UpdateAgentMetadataResponse>> {
  const session = await getSession();

  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const agentId = formData.get("agentId");

    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json(
        { success: false, error: "agentId is required." },
        { status: 400 }
      );
    }

    const data: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (key === "agentId") continue; // Already handled
      if (key === "image") {
        const imageFile = value as File;
        if (imageFile.size > 0) {
          // Upload the image and get the URL
          const filename = `${nanoid()}.${imageFile.type.split("/")[1]}`;
          const { url } = await put(filename, imageFile, {
            access: "public",
          });

          // Generate blurhash or any other processing
          const blurhash = await getBlurDataURL(url);

          data["image"] = url;
          data["imageBlurhash"] = blurhash;
        }
      } else {
        data[key] = value;
      }
    }

    // Call updateAgentMetadata with agentId and data
    const result = await updateAgentMetadata(agentId, data);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in updateAgentMetadata API route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
