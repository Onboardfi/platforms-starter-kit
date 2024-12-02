
///Users/bobbygilbert/Documents/Github/platforms-starter-kit/types/window.d.ts

interface AnalyticsJS {
    identify(userId: string, traits?: Record<string, any>): void;
    page(name?: string, properties?: Record<string, any>): void;
    track(event: string, properties?: Record<string, any>): void;
    group(groupId: string, traits?: Record<string, any>): void;
    alias(userId: string, previousId?: string): void;
    reset(): void;
    load(writeKey: string): void;
    ready(callback: () => void): void;
    debug(enabled?: boolean): void;
    on(event: string, callback: Function): void;
    timeout(milliseconds: number): void;
  }
  
  declare global {
    interface Window {
      analytics: AnalyticsJS;
    }
  }
  
  export {};