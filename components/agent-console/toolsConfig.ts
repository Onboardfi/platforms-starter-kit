// components/agent-console/toolsConfig.ts

import { Tool } from '@/lib/types'; // Ensure you have a Tool interface defined

export interface ToolDefinition {
  type: string;
  name: string;
  description: string;
  parameters: object;
}

export const toolsMapping: { [key: string]: ToolDefinition } = {
  email: {
    type: 'function',
    name: 'send_email',
    description: 'Prepare a draft email to send to a new client.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Email address of the recipient.' },
        subject: { type: 'string', description: 'Subject of the email.' },
        firstName: { type: 'string', description: 'First name of the recipient.' },
      },
      required: ['to', 'subject', 'firstName'],
    },
  },
  memory: {
    type: 'function',
    name: 'set_memory',
    description: 'Saves important data about the user into memory.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key of the memory value. Always use lowercase and underscores.',
        },
        value: {
          type: 'string',
          description: 'Value can be anything represented as a string',
        },
      },
      required: ['key', 'value'],
    },
  },
  notion: {
    type: 'function',
    name: 'add_notion_message',
    description: 'Prepare a draft message or note to potentially add to a specified Notion page.',
    parameters: {
      type: 'object',
      properties: {
        messageContent: {
          type: 'string',
          description: 'The content of the draft message or note.',
        },
      },
      required: ['messageContent'],
    },
  },
  // Add more tools as needed
};
