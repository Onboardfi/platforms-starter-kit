import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { APIErrorCode } from '@notionhq/client';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Types
type NotionTextColor =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "gray_background"
  | "brown_background"
  | "orange_background"
  | "yellow_background"
  | "green_background"
  | "blue_background"
  | "purple_background"
  | "pink_background"
  | "red_background";

interface NotionRichText {
  type: 'text';
  text: {
    content: string;
    link?: {
      url: string;
    };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: NotionTextColor;
  };
}

interface NotionParagraphBlock {
  object: 'block';
  type: 'paragraph';
  paragraph: {
    rich_text: NotionRichText[];
  };
}

type NotionBlock = NotionParagraphBlock;

// Constants
const MAX_LENGTH = 2000;
const MAX_BLOCKS_PER_REQUEST = 100;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Initialize Notion client
const notion = new Client({ 
  auth: process.env.NOTION_API_TOKEN,
  timeoutMs: 30000 // 30 second timeout
});

// Initialize rate limiter if Redis configuration is available
let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10s'), // 10 requests per 10 seconds
    analytics: true,
    prefix: '@upstash/ratelimit',
  });
}

// Utility function to split text into chunks
const splitTextIntoChunks = (text: string, maxLength: number): string[] => {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;
    
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    // Find the last sentence end (.!?) or fallback to last space
    const sentenceEnd = text.slice(start, end + 1).search(/[.!?]\s/);
    const lastSpace = text.lastIndexOf(' ', end);
    
    if (sentenceEnd > 0) {
      // Add 2 to include the punctuation and space
      const breakPoint = start + sentenceEnd + 2;
      chunks.push(text.slice(start, breakPoint));
      start = breakPoint;
    } else if (lastSpace > start) {
      chunks.push(text.slice(start, lastSpace));
      start = lastSpace + 1;
    } else {
      chunks.push(text.slice(start, end));
      start = end;
    }
  }

  return chunks;
};

// Utility function to create blocks with retry logic
const appendBlocksWithRetry = async (
  pageId: string, 
  blocks: NotionBlock[], 
  retryCount = 0
): Promise<void> => {
  try {
    // Split blocks into chunks of 100 (Notion's limit)
    for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
      const blockChunk = blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
      await notion.blocks.children.append({
        block_id: pageId,
        children: blockChunk,
      });
    }
  } catch (error: any) {
    if (retryCount >= MAX_RETRIES) {
      throw error;
    }

    if (error.code === APIErrorCode.RateLimited) {
      // Exponential backoff
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return appendBlocksWithRetry(pageId, blocks, retryCount + 1);
    }

    throw error;
  }
};

// Main API route handler
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    if (ratelimit) {
      const ip = request.ip ?? '127.0.0.1';
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);
      
      if (!success) {
        return NextResponse.json({
          error: 'Too many requests',
          limit,
          reset,
          remaining
        }, {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        });
      }
    }

    // Input validation
    const body = await request.json();
    const { messageContent, sessionId } = body;

    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid message content' },
        { status: 400 }
      );
    }

    // Environment validation
    const pageId = process.env.NOTION_PAGE_ID;
    if (!pageId) {
      console.error('Notion page ID not configured');
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Process content
    const chunks = splitTextIntoChunks(messageContent.trim(), MAX_LENGTH);
    const timestamp = new Date().toISOString();
    
    const blocks: NotionBlock[] = [
      // Add timestamp and session header
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: `Session ${sessionId} - ${timestamp}` },
            annotations: { bold: true, color: 'blue' }
          }]
        }
      },
      // Add message content
      ...chunks.map((chunk): NotionBlock => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: chunk } }]
        }
      }))
    ];

    // Append blocks with retry logic
    await appendBlocksWithRetry(pageId, blocks);

    return NextResponse.json({ 
      success: true,
      timestamp,
      chunks: chunks.length
    });

  } catch (error: any) {
    console.error('Error appending message to Notion:', error);

    // Handle specific Notion API errors
    if (error.code === APIErrorCode.Unauthorized) {
      return NextResponse.json(
        { error: 'Invalid Notion API token' },
        { status: 401 }
      );
    }

    if (error.code === APIErrorCode.ObjectNotFound) {
      return NextResponse.json(
        { error: 'Notion page not found' },
        { status: 404 }
      );
    }

    if (error.code === APIErrorCode.RateLimited) {
      return NextResponse.json(
        { error: 'Notion API rate limit exceeded' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to append message to Notion' },
      { status: 500 }
    );
  }
}