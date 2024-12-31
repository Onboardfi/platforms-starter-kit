// lib/utils/headers.ts
export const getDailyBotHeaders = (agentId: string) => {
    return {
      'Content-Type': 'application/json',
      'x-agent-id': agentId
    };
  };
  
  // And update checkApiConfig function in DailyBotConsole:
  const checkApiConfig = async (agentId: string) => {
    try {
      const response = await fetch('/api/daily-bot/debug', {
        headers: getDailyBotHeaders(agentId)
      });
      if (!response.ok) {
        throw new Error('Failed to check API configuration');
      }
      const config = await response.json();
      return config;
    } catch (error) {
      console.error('Config check failed:', error);
      return { hasUrl: false, hasApiKey: false };
    }
  };