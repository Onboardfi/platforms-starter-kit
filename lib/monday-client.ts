// lib/monday-client.ts

interface MondayClientConfig {
    personalToken: string;
    baseUrl?: string;
  }
  
  interface MondayCreateItemResponse {
    create_item?: {
      id: string;
    };
  }
  
  interface MondayError {
    message: string;
    status: number;
  }
  
  export class MondayClient {
    private token: string;
    private baseUrl: string;
    private retryCount = 3;
    private retryDelay = 1000;
  
    constructor(config: MondayClientConfig | string) {
      if (typeof config === 'string') {
        this.token = config;
        this.baseUrl = 'https://api.monday.com/v2';
      } else {
        this.token = config.personalToken;
        this.baseUrl = config.baseUrl || 'https://api.monday.com/v2';
      }
    }
  
    updateToken(newToken: string) {
      this.token = newToken;
    }
    private async delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    private async executeQuery<T>(
      query: string, 
      variables?: Record<string, any>
    ): Promise<T> {
      let lastError: Error | null = null;
  
      for (let attempt = 0; attempt < this.retryCount; attempt++) {
        try {
          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`,
            },
            body: JSON.stringify({ query, variables })
          });
  
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
            await this.delay(retryAfter * 1000);
            continue;
          }
  
          const data = await response.json();
  
          // Check for GraphQL errors
          if (data.errors?.length) {
            const error = data.errors[0];
            throw new Error(error.message);
          }
  
          if (!response.ok) {
            throw new Error(`Monday.com API error: ${response.statusText}`);
          }
  
          return data.data as T;
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < this.retryCount - 1) {
            await this.delay(this.retryDelay * Math.pow(2, attempt));
            continue;
          }
        }
      }
  
      throw lastError || new Error('Failed to execute query');
    }
  
    async createItem(
      boardId: string,
      groupId: string,
      itemName: string,
      columnValues: Record<string, any>
    ): Promise<MondayCreateItemResponse> {
      const mutation = `
        mutation createItem(
          $boardId: ID!
          $groupId: String!
          $itemName: String!
          $columnValues: JSON!
        ) {
          create_item (
            board_id: $boardId,
            group_id: $groupId,
            item_name: $itemName,
            column_values: $columnValues
          ) {
            id
          }
        }
      `;
  
      return this.executeQuery<MondayCreateItemResponse>(mutation, {
        boardId,
        groupId,
        itemName,
        columnValues: JSON.stringify(columnValues)
      });
    }
  
    async getBoardGroups(boardId: string): Promise<Array<{ id: string; title: string }>> {
      const query = `
        query getBoard($boardId: ID!) {
          boards(ids: [$boardId]) {
            groups {
              id
              title
            }
          }
        }
      `;
  
      const response = await this.executeQuery<{ boards: Array<{ groups: Array<{ id: string; title: string }> }> }>(
        query,
        { boardId }
      );
  
      return response.boards[0]?.groups || [];
    }
  
    async getBoardColumns(boardId: string): Promise<Array<{ id: string; title: string; type: string }>> {
      const query = `
        query getBoard($boardId: ID!) {
          boards(ids: [$boardId]) {
            columns {
              id
              title
              type
            }
          }
        }
      `;
  
      const response = await this.executeQuery<{ boards: Array<{ columns: Array<{ id: string; title: string; type: string }> }> }>(
        query,
        { boardId }
      );
  
      return response.boards[0]?.columns || [];
    }
  
    async validateCredentials(): Promise<boolean> {
      try {
        const query = `
          query {
            me {
              id
            }
          }
        `;
  
        await this.executeQuery(query);
        return true;
      } catch (error) {
        return false;
      }
    }
  
    // Helper method to format column values based on type
    formatColumnValue(type: string, value: any): any {
      switch (type) {
        case 'email':
          return { email: value, text: value };
        
        case 'phone':
          return { phone: value, text: value };
        
        case 'status':
          return { label: value };
        
        case 'date':
          return { date: value };
        
        case 'boolean':
          return { checked: value ? 'true' : 'false' };
        
        default:
          return value;
      }
    }
  }
  
  // Usage example:
  /*
  const monday = new MondayClient({ 
    personalToken: 'your_token_here' 
  });
  
  try {
    const response = await monday.createItem(
      'board_id',
      'group_id',
      'New Lead',
      {
        'person_name': 'John Doe',
        'email': { email: 'john@example.com', text: 'john@example.com' },
        'status': { label: 'New Lead' }
      }
    );
    
    console.log('Created item:', response.create_item?.id);
  } catch (error) {
    console.error('Failed to create item:', error);
  }
  */