// lib/segment.ts
import { Analytics } from '@segment/analytics-node';

if (!process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
  throw new Error('NEXT_PUBLIC_SEGMENT_WRITE_KEY is not set');
}

export const analytics = new Analytics({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY,
});