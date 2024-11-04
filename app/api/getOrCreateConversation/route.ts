// app/api/getOrCreateConversation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withCombinedAuth } from "@/lib/combined-auth";
import { createConversation, getSessionConversations } from "@/lib/actions";
import { eq, and } from "drizzle-orm";
import db from "@/lib/db";
import { conversations, onboardingSessions } from "@/lib/schema";
import { createId } from '@paralleldrive/cuid2';

export async function POST(req: NextRequest) {
 return withCombinedAuth(req, async (userId, agentId) => {
   // Get agentId from headers or body
   const body = await req.json();
   const effectiveAgentId = agentId || body.agentId;

   if (!effectiveAgentId) {
     console.warn('Agent ID missing in getOrCreateConversation handler.');
     return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
   }

   try {
     const { sessionId } = body;

     if (!sessionId) {
       return NextResponse.json(
         { error: "Session ID required" }, 
         { status: 400 }
       );
     }

     // Verify session belongs to agent
     const session = await db.query.onboardingSessions.findFirst({
       where: and(
         eq(onboardingSessions.id, sessionId),
         eq(onboardingSessions.agentId, effectiveAgentId)
       ),
     });

     if (!session) {
       return NextResponse.json(
         { error: "Invalid session" },
         { status: 404 }
       );
     }

     // Try to find an active conversation first
     const existingConversations = await getSessionConversations(
       sessionId, 
       'active'
     );

     let conversation = existingConversations[0];

     // If no active conversation exists, create a new one
     if (!conversation) {
       try {
         conversation = await createConversation(sessionId, {
           agentVersion: '1.0',
           clientType: 'web',
           sessionType: 'internal',
           messageCount: 0,
         });

         console.log(`Created new conversation for session ${sessionId}`);
       } catch (error) {
         console.error('Error creating conversation:', error);
         throw new Error('Failed to create new conversation');
       }
     }

     // Log the active conversation
     console.log(`Active conversation for session ${sessionId}:`, {
       conversationId: conversation.id,
       messageCount: conversation.messageCount,
       status: conversation.status,
       agentId: effectiveAgentId
     });

     return NextResponse.json({
       conversationId: conversation.id,
       isNew: !existingConversations[0],
       messageCount: conversation.messageCount,
       status: conversation.status
     });

   } catch (error) {
     console.error('Error in getOrCreateConversation:', error);
     return NextResponse.json(
       { error: "Internal server error" }, 
       { status: 500 }
     );
   }
 });
}

export async function GET(req: NextRequest) {
 return withCombinedAuth(req, async (userId, agentId) => {
   const effectiveAgentId = agentId || req.nextUrl.searchParams.get('agentId');

   if (!effectiveAgentId) {
     console.warn('Agent ID missing in getOrCreateConversation handler.');
     return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
   }

   try {
     const sessionId = req.nextUrl.searchParams.get('sessionId');

     if (!sessionId) {
       return NextResponse.json(
         { error: "Session ID required" }, 
         { status: 400 }
       );
     }

     // Verify session belongs to agent
     const session = await db.query.onboardingSessions.findFirst({
       where: and(
         eq(onboardingSessions.id, sessionId),
         eq(onboardingSessions.agentId, effectiveAgentId)
       ),
     });

     if (!session) {
       return NextResponse.json(
         { error: "Invalid session" },
         { status: 404 }
       );
     }

     const conversations = await getSessionConversations(sessionId);

     return NextResponse.json({ 
       conversations,
       count: conversations.length 
     });

   } catch (error) {
     console.error('Error fetching conversations:', error);
     return NextResponse.json(
       { error: "Internal server error" }, 
       { status: 500 }
     );
   }
 });
}