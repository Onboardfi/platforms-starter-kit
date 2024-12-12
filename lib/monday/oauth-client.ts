// lib/monday/oauth-client.ts

interface MondayOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

interface AuthorizationParams {
  state?: string;
  appVersionId?: string;
  accountSlug?: string | null;
  forceAccount?: boolean;
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
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new Error('Missing required configuration parameters');
    }
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
    try {
      const validScopes = this.validateScopes(scopes);

      const urlParams = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        scope: validScopes.join(' '),
        response_type: 'code',
        // Add these additional parameters for refresh token support
        access_type: 'offline',
        prompt: 'consent'
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
    } catch (error) {
      throw new MondayOAuthError(
        'invalid_request',
        400,
        error instanceof Error ? error.message : 'Failed to generate authorization URL'
      );
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new MondayOAuthError(
          errorData.error || 'Token exchange failed',
          response.status,
          errorData.error_description
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof MondayOAuthError) {
        throw error;
      }
      throw new MondayOAuthError(
        'token_exchange_failed',
        500,
        error instanceof Error ? error.message : 'Failed to exchange code for token'
      );
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new MondayOAuthError(
          errorData.error || 'Token refresh failed',
          response.status,
          errorData.error_description
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof MondayOAuthError) {
        throw error;
      }
      throw new MondayOAuthError(
        'token_refresh_failed',
        500,
        error instanceof Error ? error.message : 'Failed to refresh token'
      );
    }
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
      'temporary_unavailable': 500,
      'token_expired': 401,
      'invalid_token': 401
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