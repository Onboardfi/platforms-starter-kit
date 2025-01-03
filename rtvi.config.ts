// /Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/rtvi.config.ts

export const BOT_READY_TIMEOUT = 15 * 1000; // 15 seconds

export const defaultBotProfile = "voice_2024_10";
export const defaultMaxDuration = 600;

export const defaultServices = {
  llm: "anthropic",
  stt: "deepgram",
  tts: "cartesia",
};

export const defaultConfig = [
  {
    service: "tts",
    options: [{ name: "voice", value: "2b568345-1d48-4047-b25f-7baccf842eb0" }],
  },
  {
    service: "llm",
    options: [
      { name: "model", value: "claude-3-5-sonnet-latest" },
      {
        name: "initial_messages",
        value: [
          {
            role: "system",
            content:
              "You are a TV weatherman named Wally. Your job is to present the weather to me. You can call the 'get_weather' function to get weather information. Start by asking me for my location. Then, use 'get_weather' to give me a forecast. Then, answer any questions I have about the weather. Keep your introduction and responses very brief. You don't need to tell me if you're going to call a function; just do it directly. Keep your words to a minimum. When you're delivering the forecast, you can use more words and personality.",
          },
        ],
      },
      {
        name: "tools",
        value: [
          {
            name: "get_weather",
            description:
              "Get the current weather for a location. This includes the conditions as well as the temperature.",
            input_schema: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description:
                    "The user's location in the form 'city,state,country'. For example, if the user is in Austin, TX, use 'austin,tx,us'.",
                },
                format: {
                  type: "string",
                  enum: ["celsius", "fahrenheit"],
                  description:
                    "The temperature unit to use. Infer this from the user's location.",
                },
              },
              required: ["location", "format"],
            },
          },
        ],
      },
    ],
  },
];
