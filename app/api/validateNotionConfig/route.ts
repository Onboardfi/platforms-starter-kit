// app/api/validateNotionConfig/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const notionToken = process.env.NOTION_API_TOKEN;
    const notionPageId = process.env.NOTION_PAGE_ID;

    const missingConfig = [];
    if (!notionToken) missingConfig.push('NOTION_API_TOKEN');
    if (!notionPageId) missingConfig.push('NOTION_PAGE_ID');

    if (missingConfig.length > 0) {
        return NextResponse.json({
            error: `Missing required Notion configuration: ${missingConfig.join(', ')}`,
            missingConfig
        }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}