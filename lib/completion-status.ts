import WebSocketHandler from '@/lib/websocket-handler';

export type CompletionStatus = {
  completed: boolean;
  timestamp: string;
  details?: Record<string, any>;
};

export type StepCompletionMemory = {
  [key: string]: CompletionStatus;
};

export class CompletionStatusStorage {
  private wsHandler: WebSocketHandler;
  private memory: { [key: string]: any } = {};

  constructor(wsHandler: WebSocketHandler) {
    this.wsHandler = wsHandler;
  }

  async storeCompletion(
    step: string,
    details?: Record<string, any>
  ): Promise<void> {
    if (!this.wsHandler?.isConnected()) {
      console.error('WebSocket not connected for storing completion status');
      return;
    }

    const completionStatus: CompletionStatus = {
      completed: true,
      timestamp: new Date().toISOString(),
      details
    };

    const key = `${step}_step_completed`;
    this.memory[key] = completionStatus;

    // Store completion in memory and send success response
    await this.wsHandler.sendMessage({
      type: 'response.create',
      messages: [{
        role: 'assistant',
        content: [{
          type: 'function_call',
          function_call: {
            name: 'store_memory',
            arguments: JSON.stringify({
              key,
              value: JSON.stringify(completionStatus)
            })
          }
        }]
      }]
    });

    // Log current memory state
    console.log('Memory Storage Update:', {
      step,
      key,
      value: completionStatus,
      allMemory: this.memory
    });

    // Send success response
    await this.wsHandler.sendMessage({
      type: 'response.create',
      messages: [{
        role: 'assistant',
        content: [{
          type: 'text',
          text: JSON.stringify({ ok: true })
        }]
      }]
    });
  }

  // Method to store email completion
  async storeEmailCompletion(details: { to: string; subject: string }): Promise<void> {
    await this.storeCompletion('email', details);
    await this.updateStepsCompletedMemory('email', details);
  }

  // Method to store Monday.com lead completion  
  async storeMondayLeadCompletion(details: { name: string; company?: string }): Promise<void> {
    await this.storeCompletion('monday', details);
    await this.updateStepsCompletedMemory('monday', details);
  }

  // Method to store notion completion
  async storeNotionCompletion(details?: { pageId?: string }): Promise<void> {
    await this.storeCompletion('notion', details);
    await this.updateStepsCompletedMemory('notion', details);
  }

  // Method to store notes completion
  async storeNotesCompletion(): Promise<void> {
    await this.storeCompletion('notes');
    await this.updateStepsCompletedMemory('notes');
  }

  private async updateStepsCompletedMemory(
    step: string, 
    details?: Record<string, any>
  ): Promise<void> {
    const completionStatus = {
      completed: true,
      timestamp: new Date().toISOString(),
      details
    };

    this.memory['steps_completed'] = {
      ...this.memory['steps_completed'],
      [step]: completionStatus
    };

    // Update the main steps_completed memory key
    await this.wsHandler.sendMessage({
      type: 'response.create',
      messages: [{
        role: 'assistant',
        content: [{
          type: 'function_call',
          function_call: {
            name: 'store_memory',
            arguments: JSON.stringify({
              key: 'steps_completed',
              value: JSON.stringify({
                [step]: completionStatus
              })
            })
          }
        }]
      }]
    });

    // Log updated aggregated completion status
    console.log('Steps Completed Memory Update:', {
      step,
      status: completionStatus,
      allStepsCompleted: this.memory['steps_completed']
    });

    // Send success response
    await this.wsHandler.sendMessage({
      type: 'response.create',
      messages: [{
        role: 'assistant',
        content: [{
          type: 'text',
          text: JSON.stringify({ ok: true })
        }]
      }]
    });
  }

  // Helper method to get current memory state
  getMemoryState(): { [key: string]: any } {
    return { ...this.memory };
  }
}