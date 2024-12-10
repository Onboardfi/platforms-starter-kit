// lib/monday/oauth-client.ts

interface MondayOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }
  
  interface AuthorizationParams {
    state?: string;
    appVersionId?: string;
    accountSlug?: string | null;
    forceAccount?: boolean;
  }
  
  interface TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    scope: string;
  }
  
  export class MondayOAuthClient {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;
    
    private readonly AUTH_BASE_URL = 'https://auth.monday.com/oauth2/authorize';
    private readonly TOKEN_URL = 'https://auth.monday.com/oauth2/token';
    
    // All available Monday.com scopes from their documentation
    private readonly AVAILABLE_SCOPES = new Set([
      'account:read',
      'assets:read',
      'boards:read',
      'boards:write',
      'docs:read',
      'docs:write',
      'me:read',
      'notifications:write',
      'tags:read',
      'teams:read',
      'updates:read',
      'updates:write',
      'users:read',
      'users:write',
      'webhooks:read',
      'webhooks:write',
      'workspaces:read',
      'workspaces:write'
    ]);
  
    // Scope mappings for convenience
    private readonly SCOPE_MAPPINGS: Record<string, string> = {
      'items:read': 'boards:read',
      'items:write': 'boards:write'
    };
  
    constructor(config: MondayOAuthConfig) {
      this.clientId = config.clientId;
      this.clientSecret = config.clientSecret;
      this.redirectUri = config.redirectUri;
    }
  
    /**
     * Map convenience scopes to actual Monday.com scopes
     */
    private mapScopes(scopes: string[]): string[] {
      return scopes.map(scope => this.SCOPE_MAPPINGS[scope] || scope);
    }
  
    /**
     * Validate requested scopes against available scopes
     */
    private validateScopes(scopes: string[]): string[] {
      // Map any convenience scopes first
      const mappedScopes = this.mapScopes(scopes);
      
      const invalidScopes = mappedScopes.filter(
        scope => !this.AVAILABLE_SCOPES.has(scope)
      );
      
      if (invalidScopes.length > 0) {
        throw new Error(`Invalid scopes requested: ${invalidScopes.join(', ')}`);
      }
  
      return mappedScopes;
    }
  
    /**
     * Generate the authorization URL with all parameters
     */
    getAuthorizationUrl(
      scopes: string[],
      params: AuthorizationParams = {}
    ): string {
      // Validate and map scopes
      const validScopes = this.validateScopes(scopes);
  
      const urlParams = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        scope: validScopes.join(' ')
      });
  
      // Add optional parameters if they exist
      if (params.state) {
        urlParams.append('state', params.state);
      }
      
      if (params.appVersionId) {
        urlParams.append('app_version_id', params.appVersionId);
      }
  
      // Handle account-specific authorization
      if (params.accountSlug) {
        if (params.forceAccount) {
          return `${this.AUTH_BASE_URL}?${urlParams.toString()}&subdomain=${params.accountSlug}`;
        } 
        return `https://${params.accountSlug}.monday.com/oauth2/authorize?${urlParams.toString()}`;
      }
  
      return `${this.AUTH_BASE_URL}?${urlParams.toString()}`;
    }
  
    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code: string): Promise<TokenResponse> {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new MondayOAuthError(
          errorData.error || 'Token exchange failed',
          response.status
        );
      }
  
      return response.json();
    }
  
    /**
     * Parse error from OAuth redirect
     */
    parseError(searchParams: URLSearchParams): MondayOAuthError | null {
      const error = searchParams.get('error');
      if (!error) return null;
  
      const errorDescription = searchParams.get('error_description') || '';
      return new MondayOAuthError(error, this.getErrorStatus(error), errorDescription);
    }
  
    /**
     * Map error codes to HTTP status codes
     */
    private getErrorStatus(error: string): number {
      const errorMap: Record<string, number> = {
        'invalid_request': 400,
        'unauthorized_client': 403,
        'access_denied': 403,
        'invalid_scope': 403,
        'server_error': 500,
        'temporary_unavailable': 500
      };
      return errorMap[error] || 500;
    }
  
    /**
     * Generate a cryptographically secure state parameter
     */
    generateState(): string {
      return crypto.randomUUID();
    }
  }
  
  /**
   * Custom error class for Monday.com OAuth errors
   */
  export class MondayOAuthError extends Error {
    constructor(
      public code: string,
      public status: number,
      public description: string = ''
    ) {
      super(`Monday OAuth Error: ${code} - ${description}`);
      this.name = 'MondayOAuthError';
    }
  }