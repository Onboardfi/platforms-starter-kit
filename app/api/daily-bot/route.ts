// app/api/daily-bot/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { defaultBotProfile, defaultConfig } from "@/rtvi.config";

// NOTE: This route handles *all* POSTs to /api/daily-bot.
// We check the "path" field in the JSON body to decide what to do.

// app/api/daily-bot/route.ts

export async function POST(request: Request) {
    try {
      const { services, config } = await request.json();
  
      if (!services || !config || !process.env.DAILY_BOTS_URL) {
        return Response.json({ error: "Missing configuration" }, { status: 400 });
      }
  
      const response = await fetch(process.env.DAILY_BOTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          bot_profile: "voice_2024_10",
          max_duration: 600,
          services,
          config
        })
      });
  
      const data = await response.json();
      return Response.json(data, { status: response.status });
  
    } catch (error) {
      console.error('Daily Bot Error:', error);
      return Response.json({ error: "Operation failed" }, { status: 500 });
    }
  }