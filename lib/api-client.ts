// lib/api-client.ts

import axios, { 
    AxiosRequestConfig, 
    InternalAxiosRequestConfig, 
    AxiosError,
    AxiosHeaders,
    AxiosResponse
  } from 'axios';
  
  // Enhanced Type Definitions
  interface AuthState {
    userId: string;
    agentId?: string;
    sessionId?: string | null; // Changed to allow null
    isAnonymous?: boolean;
    isAuthenticated: boolean;
  }
  interface Agent {
    id: string;
    name: string;
    description?: string;
    slug: string;
    settings: {
      onboardingType: 'internal' | 'external';
      authentication?: {
        enabled: boolean;
        message?: string;
      };
      steps?: Array<{
        id: string;
        title: string;
        description: string;
        completed: boolean;
        completionTool?: string;
        completedAt?: string;
      }>;
    };
    site?: {
      id: string;
      name: string;
      logo?: string;
      subdomain: string;
    };
  }
  
  interface Session {
    id: string;
    name: string;
    status: 'active' | 'completed' | 'abandoned';
    type: string;
    createdAt: string;
    lastInteractionAt?: string;
    stepProgress: {
      steps: Array<{
        id: string;
        title: string;
        description: string;
        completed: boolean;
        completionTool?: string;
        completedAt?: string;
      }>;
    };
  }
  
  interface AuthResponse {
    success: boolean;
    userId: string;
    agentId?: string;
    sessionId?: string;
    isAnonymous?: boolean;
    isAuthenticated: boolean;
    requiresAuth?: boolean;
    error?: string;
    agentName?: string;
    authMessage?: string;
  }
  class AuthStateManager {
    private authState: AuthState | null = null;
    private verifyPromise: Promise<AuthState | null> | null = null;
    private lastVerified: number = 0;
    private readonly minVerifyInterval = 5000;
    private currentSessionId: string | null = null;
  
  
    async getAuthState(forceCheck: boolean = false, agentId?: string): Promise<AuthState | null> {
      const now = Date.now();
      
      if (!forceCheck && this.authState && (now - this.lastVerified) < this.minVerifyInterval) {
        return this.authState;
      }
  
      if (this.verifyPromise) {
        return this.verifyPromise;
      }
  
      this.verifyPromise = this.verifyAuth(agentId).finally(() => {
        this.verifyPromise = null;
        this.lastVerified = Date.now();
      });
  
      return this.verifyPromise;
    }
  
    setCurrentSession(sessionId: string | null) {
        this.currentSessionId = sessionId;
        if (this.authState) {
          // Now TypeScript will accept null since we updated the AuthState interface
          this.authState.sessionId = sessionId;
        }
      }
    
  
      getCurrentSession(): string | null {
        return this.currentSessionId;
      }
    
      private async verifyAuth(agentId?: string): Promise<AuthState | null> {
        try {
          const effectiveAgentId = this.authState?.agentId || agentId;
    
          if (!effectiveAgentId) {
            console.warn('No agent ID available for verification');
            return null;
          }
    
          const response = await apiClient.get<AuthResponse>('/api/auth/verify-onboarding-token', {
            headers: {
              'x-agent-id': effectiveAgentId,
              ...(this.currentSessionId && { 'x-session-id': this.currentSessionId })
            },
            params: {
              agentId: effectiveAgentId
            }
          });
    
          if (response.data.success) {
            this.authState = {
              userId: response.data.userId,
              agentId: response.data.agentId || effectiveAgentId,
              sessionId: this.currentSessionId, // This will now work with the updated type
              isAnonymous: response.data.isAnonymous,
              isAuthenticated: response.data.isAuthenticated
            };
            return this.authState;
          }
          
          this.authState = null;
          return null;



      } catch (error) {
        const axiosError = error as AxiosError<AuthResponse>;
        const responseData = axiosError.response?.data;
        
        if (axiosError.response?.status === 401) {
          const effectiveId = agentId || this.authState?.agentId;
          const isVerificationRequest = axiosError.config?.url?.includes('verify-onboarding-token');
          
          if (!isVerificationRequest && responseData?.requiresAuth && effectiveId) {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = `/login?agentId=${effectiveId}`;
              return null;
            }
          } else if (effectiveId && !responseData?.requiresAuth) {
            try {
              return await this.handleAnonymousAuth(effectiveId);
            } catch (innerError) {
              console.error('Failed to create anonymous session:', innerError);
            }
          }
        }
  
        this.authState = null;
        return null;
      }
    }
  
    private async handleAnonymousAuth(agentId: string): Promise<AuthState | null> {
      try {
        const response = await apiClient.post<AuthResponse>('/api/auth/verify-onboarding-password', {
          agentId,
          anonymous: true
        });
  
        if (response.data.success) {
          return this.verifyAuth(agentId);
        }
      } catch (error) {
        console.error('Anonymous auth failed:', error);
      }
      return null;
    }
  
    clearAuthState() {
      this.authState = null;
      this.lastVerified = 0;
      this.currentSessionId = null;
    }
  
    getCurrentAgentId(): string | undefined {
      return this.authState?.agentId;
    }
  
 getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.authState?.agentId) {
      headers['x-agent-id'] = this.authState.agentId;
    }
    
    if (this.authState?.userId) {
      headers['x-user-id'] = this.authState.userId;
    }

    // Only add session header if we have a non-null session ID
    if (this.currentSessionId !== null) {
      headers['x-session-id'] = this.currentSessionId;
    }

    if (this.authState?.isAnonymous) {
      headers['x-anonymous'] = 'true';
    }

    return headers;
  }
  }
  
  const authStateManager = new AuthStateManager();
  
  // Create Axios Instance
  const apiClient = axios.create({
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // Request Interceptor
  apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
  
      const isAuthEndpoint = config.url?.includes('/api/auth/');
      if (!isAuthEndpoint) {
        const agentId = config.headers['x-agent-id'] as string | undefined;
        const authState = await authStateManager.getAuthState(false, agentId);
        if (authState) {
          Object.assign(config.headers, authStateManager.getAuthHeaders());
        }
      }
  
      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );
  
  // Response Interceptor
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
  
        if (originalRequest.url?.includes('/api/auth/')) {
          return Promise.reject(error);
        }
  
        try {
          const agentId = originalRequest.headers?.['x-agent-id'] as string | undefined;
          const authState = await authStateManager.getAuthState(true, agentId);
          
          if (!authState) {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              const effectiveAgentId = agentId || authStateManager.getCurrentAgentId();
              if (effectiveAgentId) {
                window.location.href = `/login?agentId=${effectiveAgentId}`;
                return new Promise(() => {});
              }
            }
            return Promise.reject(error);
          }
  
          Object.assign(originalRequest.headers, authStateManager.getAuthHeaders());
          return apiClient(originalRequest);
        } catch (verifyError) {
          if (verifyError instanceof Error) {
            return Promise.reject(verifyError);
          }
          return Promise.reject(new Error('Authentication verification failed'));
        }
      }
  
      return Promise.reject(error);
    }
  );
  
  // API Methods
  const api = {
    async verifyAuth(forceCheck: boolean = false, agentId?: string): Promise<AuthState | null> {
      return authStateManager.getAuthState(forceCheck, agentId);
    },
  
    async init(agentId?: string): Promise<void> {
      await authStateManager.getAuthState(true, agentId);
    },
  
    async createSession(
      name: string = 'New Session', 
      type: string = 'internal',
      agentId?: string
    ): Promise<string | null> {
      try {
        const effectiveAgentId = agentId || authStateManager.getCurrentAgentId();
        if (!effectiveAgentId) {
          throw new Error('No agent ID available');
        }
  
        const response = await apiClient.post<{
          sessionId: string;
          success: boolean;
        }>('/api/createSession', {
          name,
          type,
          agentId: effectiveAgentId
        }, {
          headers: {
            'x-agent-id': effectiveAgentId
          }
        });
  
        if (response.data.success) {
          const sessionId = response.data.sessionId;
          authStateManager.setCurrentSession(sessionId);
          return sessionId;
        }
        return null;
      } catch (error) {
        if (error instanceof Error) {
          console.error('Failed to create session:', error.message);
        }
        throw error;
      }
    },
  
    async setCurrentSession(sessionId: string | null) {
      authStateManager.setCurrentSession(sessionId);
    },
  
    async getSessions(agentId?: string): Promise<Session[]> {
      const effectiveAgentId = agentId || authStateManager.getCurrentAgentId();
      if (!effectiveAgentId) {
        return [];
      }
  
      const response = await apiClient.get<{ sessions: Session[] }>('/api/getSessions', {
        headers: {
          'x-agent-id': effectiveAgentId
        }
      });
      return response.data.sessions;
    },
  
    clearAuthState() {
      authStateManager.clearAuthState();
    }
  };
  
  const instance = Object.assign(apiClient, api);
  
  if (typeof window !== 'undefined') {
    instance.init().catch((error: unknown) => {
      if (error instanceof Error) {
        console.error('Failed to initialize auth state:', error.message);
      }
    });
  }
  
  export type { AuthState, Agent, Session };
  export default instance;