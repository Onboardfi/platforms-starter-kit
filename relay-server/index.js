// relay-server/index.js
import { RealtimeRelay } from './lib/relay.mjs';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error(
    `Environment variable "OPENAI_API_KEY" is required.\n` +
    `Please set it in your .env file.`
  );
  process.exit(1);
}

const PORT = parseInt(process.env.RELAY_SERVER_PORT) || 8081;

const relayServer = new RealtimeRelay(OPENAI_API_KEY, PORT);
relayServer.listen();

// Prevent the process from exiting
setInterval(() => {}, 1000);
// Alternatively, you can use process.stdin.resume();
// process.stdin.resume();