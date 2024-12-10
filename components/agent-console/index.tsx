// components/agent-console/index.tsx

'use client';
import { addMessage, getConversationMessages } from '@/lib/actions';
import {
  MessageType,
  MessageRole,
  MessageContent,
  MessageMetadata,
} from '@/lib/types';

// Core React imports
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Component imports
import { Navbar } from './Navbar';
import { TabContent } from './TabContent';
import { Footer } from './Footer';
import OnboardingProgressSidebar from '@/components/OnboardingProgressCard';
import { EmailTemplate } from '@/components/email-template';

// UI Component imports
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';

// Third-party imports
import { toast } from 'sonner';
import axios from 'axios';

// Utility imports
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { WavRenderer } from '@/app/utils/wav_renderer';
import apiClient from '@/lib/api-client';
import PasswordAuthWrapper from '@/components/auth/PasswordAuthWrapper';
import { createId } from '@paralleldrive/cuid2';

// Type imports
import {
  AgentConsoleProps,
  DraftEmail,
  Session,
  WebSocketMessage,
  ConversationItem,
  DraftLead,
} from './utils/types';

// WebSocket Handler
import EnhancedWebSocketHandler from '@/lib/websocket-handler';

// Base64 Utilities
import {
  arrayBufferToBase64,
  base64ToInt16Array,
  base64ToArrayBuffer,
} from '@/lib/utils/base64Utils';
type ToolCallMetadata = {
  tool: string;
  input: Record<string, any>;
  timestamp: string;
  result?: {
    success: boolean;
    leadId?: string;
  };
  error?: string;
};

/**
 * **Helper Function**
 * Convert agent tool names to WebSocket tool configurations
 */



const getToolConfigurations = (tools: string[]) => {
  const toolConfigs = [];

  for (const tool of tools) {
    switch (tool) {
      case 'memory':
        toolConfigs.push({
          type: 'function',
          name: 'store_memory',
          description: 'Store a value in memory with a given key',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['key', 'value'],
          },
        });
        break;
        case 'monday':
        toolConfigs.push({
          type: 'function',
          name: 'create_lead',
          description: 'Create a new lead in Monday.com CRM',
          parameters: {
            type: 'object',
            properties: {
              firstName: {
                type: 'string',
                description: 'First name of the lead'
              },
              lastName: {
                type: 'string',
                description: 'Last name of the lead'
              },
              company: {
                type: 'string',
                description: 'Company name',
                optional: true
              },
              email: {
                type: 'string',
                description: 'Email address',
                optional: true
              },
              phone: {
                type: 'string',
                description: 'Phone number',
                optional: true
              },
              source: {
                type: 'string',
                description: 'Lead source',
                optional: true
              },
              notes: {
                type: 'string',
                description: 'Additional notes about the lead',
                optional: true
              }
            },
            required: ['firstName', 'lastName']
          }
        });
        break;
      case 'notion':
        toolConfigs.push({
          type: 'function',
          name: 'add_to_notion',
          description: 'Add content to a Notion document',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string' },
            },
            required: ['content'],
          },
        });
        break;

      case 'email':
        toolConfigs.push({
          type: 'function',
          name: 'send_email',
          description: 'Send an email',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string' },
              subject: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['to', 'subject', 'body'],
          },
        });
        break;
    }
  }

  return toolConfigs;
};

/**
 * **AgentConsole Component**
 */
function AgentConsole({ agent }: AgentConsoleProps) {
  // UI State

  // State for draft lead handling
const [draftLead, setDraftLead] = useState<DraftLead | null>(null);
const [isEditingLead, setIsEditingLead] = useState(false);
  const [activeTab, setActiveTab] = useState('workspace');
  const [isRecording, setIsRecording] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [data, setData] = useState(agent);

  // Extract allowMultipleSessions from agent settings
  const allowMultipleSessions = agent.settings?.allowMultipleSessions;

  // Define tabs here
  const tabs = [
    { name: 'Workspace', id: 'workspace' },
    { name: 'Conversation', id: 'conversation' },
    ...(allowMultipleSessions !== false
      ? [{ name: 'Sessions', id: 'sessions' }]
      : []),
    { name: 'Integrations', id: 'integrations' },
  ];

  // Conversation State
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState<DraftEmail | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSessionId');
    }
    return null;
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);

    // Step Completion State
    const [emailSent, setEmailSent] = useState(false);
    const [notesTaken, setNotesTaken] = useState(false);
    const [notionMessageSent, setNotionMessageSent] = useState(false);
    const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});

    // Conversation Items
    const [items, setItems] = useState<ConversationItem[]>([]);

    // Current Conversation ID
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [functionCallArguments, setFunctionCallArguments] = useState<{[callId: string]: string}>({});

    // Modify the setItems logic to prevent duplicates
    const addUniqueItem = useCallback((newItem: ConversationItem) => {
      setItems((prevItems) => {
        // Check if item already exists
        const exists = prevItems.some(item => item.id === newItem.id);
        if (exists) {
          // Update existing item instead of adding a duplicate
          return prevItems.map(item => 
            item.id === newItem.id ? { ...item, ...newItem } : item
          );
        }
        // Add new item
        return [...prevItems, newItem];
      });
    }, []);

    // Refs
    const wavRecorderRef = useRef<WavRecorder>(
        new WavRecorder({ sampleRate: 24000 }) // Ensure the constructor expects an options object
    );
    const wavStreamPlayerRef = useRef<WavStreamPlayer>(
        new WavStreamPlayer({ sampleRate: 24000 })
    );
    const clientCanvasRef = useRef<HTMLCanvasElement>(null);
    const serverCanvasRef = useRef<HTMLCanvasElement>(null);
    const startTimeRef = useRef<string>(new Date().toISOString());

    // WebSocket Handler Reference
    const wsHandler = useRef<EnhancedWebSocketHandler | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Listening indicator state
    const [isListening, setIsListening] = useState(false);

    // Ref to track the latest canPushToTalk value
    const canPushToTalkRef = useRef(canPushToTalk);

    useEffect(() => {
        canPushToTalkRef.current = canPushToTalk;
    }, [canPushToTalk]);

    /**
     * **Fetch Messages for a Conversation**
     */
    const fetchMessages = useCallback(async (conversationId: string) => {
        if (!conversationId) {
            console.log('Missing conversationId');
            return;
        }
        
        try {
            const messages = await getConversationMessages(conversationId);
            // Transform the messages to match ConversationItem type
            const conversationItems = messages.map(msg => ({
                ...msg,
                object: 'realtime.item', // Add required property
                status: msg.metadata?.isFinal ? 'completed' : 'pending', // Add required property
                content: Array.isArray(msg.content) ? msg.content : [{
                    type: msg.type,
                    text: msg.content.text || '',
                    transcript: msg.content.transcript
                }]
            })) as ConversationItem[];
            
            setItems(conversationItems);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            toast.error('Failed to load messages');
        }
    }, []);

    /**
     * **Handle Audio Playback Errors**
     */
    const handleAudioError = useCallback(async (error: any) => {
        console.error('Audio playback error:', error);
        toast.error('Failed to play audio response');
        if (wavStreamPlayerRef.current?.interrupt) {
            try {
                await wavStreamPlayerRef.current.interrupt();
            } catch (interruptError) {
                console.error('Error interrupting stream:', interruptError);
            }
        }
    }, []);

    /**
     * **Send Message Function**
     * Sends a message through the WebSocket connection using EnhancedWebSocketHandler.
     */
    const [isResponseActive, setIsResponseActive] = useState(false);
    
    const sendMessage = useCallback((message: any) => {
      if (message.type === 'response.create' && isResponseActive) {
        console.warn('Response already active. Skipping message:', message);
        return;
      }
    
      if (message.type === 'response.create') {
        setIsResponseActive(true);
      }
    
      console.log('Attempting to send message:', message);
      if (!wsHandler.current) {
        console.warn('WebSocket handler not initialized');
        return;
      }
    
      if (wsHandler.current.isConnected()) {
        wsHandler.current.sendMessage(message);
      } else {
        console.warn('WebSocket is not connected. Queuing message:', message);
        wsHandler.current.sendMessage(message);
      }
    }, [isResponseActive]);

    /**
     * **Save Message to Database**
     * Saves a conversation message to the database via the saveMessage API route.
     */
   // File: components/agent-console/index.tsx

   const saveMessageToDatabase = useCallback(async (item: ConversationItem, conversationId: string) => {
    try {
      console.log('Attempting to save message:', {
        messageId: item.id,
        conversationId,
        content: item.content
      });
  
      let content: MessageContent;
      if (item.type === 'function_call') {
        // For function calls, we'll format the content without using type
        content = {
          text: JSON.stringify(item.content[0]?.function_call),
          function_call: item.content[0]?.function_call
        };
      } else {
        // For regular messages, use standard content structure
        content = {
          text: item.content[0]?.text || item.content[0]?.transcript || '',
          transcript: item.content[0]?.transcript,
          audioUrl: item.content[0]?.audioUrl
        };
      }
  
      const message = await addMessage({
        id: item.id,
        conversationId,
        type: item.type as MessageType,
        role: item.role as MessageRole,
        content,
        metadata: {
          ...item.metadata,
          toolCalls: item.type === 'function_call' ? [{
            tool: item.name || '',
            input: JSON.parse(item.arguments || '{}'),
            timestamp: new Date().toISOString()
          }] : []
        },
        stepId: item.stepId,
        parentMessageId: item.parentMessageId
      });
  
      console.log('Message saved to database:', message.id);
      return message;
    } catch (error) {
      console.error('Failed to save message:', error);
      console.error('Message data:', item);
      toast.error('Failed to save message to database');
      throw error;
    }
  }, []);

    /**
     * **Handle WebSocket Message**
     * Processes incoming WebSocket messages, including function calls.
     */
    const handleWebSocketMessage = useCallback(async (data: WebSocketMessage) => {
        console.log('Received WebSocket message:', data);
        console.log('Current canPushToTalk:', canPushToTalkRef.current);

        switch (data.type) {
            // Session Events
            case 'session.created':
                console.log('Session created:', data.session);
                break;

            case 'session.updated':
                console.log('Session updated:', data.session);
                break;

            // Conversation Events
            case 'conversation.created':
                if (data.conversation?.id && data.conversation.id !== conversationId) {
                    console.log('New conversation created:', data.conversation.id);
                    setConversationId(data.conversation.id);
                    await fetchMessages(data.conversation.id);
                }
                break;

            case 'conversation.item.created':
                if (data.item && !items.some(item => item.id === data.item.id)) {
                    console.log('Conversation item created:', data.item.id);
                    addUniqueItem(data.item as ConversationItem);
                }
                break;

            // Input Audio Buffer Events
            case 'input_audio_buffer.speech_started':
                if (!canPushToTalkRef.current) {
                    console.log('Speech started in perpetual mode');
                    setIsListening(true);
                }
                break;

            case 'input_audio_buffer.speech_stopped':
                if (!canPushToTalkRef.current) {
                    console.log('Speech stopped in perpetual mode');
                    setIsListening(false);
                }
                break;

            case 'input_audio_buffer.committed':
                if (data.item_id && conversationId && !isResponseActive) {
                    console.log('Audio buffer committed:', data.item_id);
                    setIsResponseActive(true); // Set active before sending
                    sendMessage({ type: 'response.create' });
                }
                break;

            case 'input_audio_buffer.cleared':
                console.log('Audio buffer cleared');
                break;

            // Transcription Events
            case 'conversation.item.input_audio_transcription.completed':
                if (data.transcript && data.item_id && conversationId) {
                    console.log(`Transcription completed for item ${data.item_id}: "${data.transcript.trim()}"`);
                    
                    const messageItem = {
                        id: data.item_id,
                        role: 'user',
                        type: 'message',
                        status: 'completed',
                        content: [{
                            type: 'transcript',
                            text: data.transcript.trim(),
                            transcript: data.transcript.trim()
                        }]
                    } as ConversationItem;
            
                    // Use the action instead of direct API call
                    await saveMessageToDatabase(messageItem, conversationId);
                    addUniqueItem(messageItem);
                }
                break;

            // Response Events
            case 'response.created':
                if (data.response?.id) {
                    console.log('Response created:', data.response.id);
                    setIsResponseActive(true);
                }
                break;

            case 'response.output_item.added':
                if (data.item && !items.some(item => item.id === data.item.id)) {
                    console.log('Response output item added:', data.item.id);
                    addUniqueItem(data.item as ConversationItem);
                }
                break;
// Update the handleWebSocketMessage switch case for function calls:
case 'response.function_call_arguments.delta':
    if (data.call_id && data.delta) {
        setFunctionCallArguments(prev => ({
            ...prev,
            [data.call_id]: (prev[data.call_id] || '') + data.delta
        }));
    }
    break;
      // Update the function call handling in handleWebSocketMessage
      case 'response.output_item.done':
        if (data.item && conversationId) {
          console.log('Response output item done:', data.item.id);
          
          if (data.item.type === 'function_call') {
            try {
              const args = JSON.parse(data.item.arguments);
              const functionMessage: ConversationItem = {
                id: data.item.id,
                type: 'function_call',
                role: 'assistant',
                object: 'realtime.item',
                status: 'completed',
                name: data.item.name || '',
                call_id: data.item.call_id,
                arguments: data.item.arguments,
                content: [{
                  text: JSON.stringify(args),
                  function_call: {
                    name: data.item.name || '',
                    arguments: data.item.arguments,
                    call_id: data.item.call_id
                  },
                  type: ''
                }],
                // Initialize metadata with required properties
                metadata: {
                  isFinal: true,
                  toolCalls: []
                }
              };
          
              await saveMessageToDatabase(functionMessage, conversationId);
              addUniqueItem(functionMessage);
      
              // Handle different function types
              switch (data.item.name) {
                case 'store_memory':
                  setMemoryKv(prev => ({
                    ...prev,
                    [args.key]: args.value
                  }));
                  break;
      
                case 'send_email':
                  setDraftEmail({
                    to: args.to,
                    subject: args.subject,
                    body: args.body || '',
                    firstName: args.firstName || ''
                  });
                  setActiveTab('workspace');
                  setIsEditingEmail(true);
                  break;
      
                case 'add_to_notion':
                  setDraftNote(args.content);
                  setActiveTab('workspace');
                  setIsEditingDraft(true);
                  break;


                  
// Then update the create_lead case with proper typing:
case 'create_lead':
  try {
    // Format the lead data from the AI's response
    const formattedLead = {
      firstName: args.firstName,
      lastName: args.lastName,
      company: args.company || '',
      email: args.email || '',
      phone: args.phone || '',
      source: args.source || '',
      notes: args.notes || ''
    };
    
    // Show the lead form in workspace tab first (like email)
    setDraftLead(formattedLead);
    setActiveTab('workspace');
    setIsEditingLead(false);
    
    // Save the function call metadata
    const toolCall = {
      tool: data.item.name || '',
      input: args,
      timestamp: new Date().toISOString()
    };

    // Add the tool call to metadata without the result yet
    functionMessage.metadata = {
      ...functionMessage.metadata ?? {},
      toolCalls: [...(functionMessage.metadata?.toolCalls ?? []), toolCall]
    };
    
    // Note that we don't create the lead yet - that happens when the user clicks the submit button
    // in the WorkspaceTab component

  } catch (error) {
    console.error('Error preparing lead:', error);
    toast.error('Failed to prepare lead form');
  }
  break;
              }
      
            } catch (error) {
              console.error('Error handling function call:', error);
              toast.error('Failed to process function call');
            }
          } else {
            // Handle regular assistant messages
            const assistantMessage = {
              ...data.item,
              role: 'assistant',
              status: 'completed'
            } as ConversationItem;
      
            await saveMessageToDatabase(assistantMessage, conversationId);
            addUniqueItem(assistantMessage);
          }
        }
        break;
                case 'response.done':
                    if (data.response?.usage && conversationId && currentSessionId) {
                        const usage = data.response.usage;
                        const lastItem = data.response.output?.[data.response.output?.length - 1];
                        
                        if (lastItem) {
                            try {
                                // Save message with metadata
                                const messageMetadata = {
                                    ...lastItem.metadata,
                                    promptTokens: usage.input_tokens,
                                    completionTokens: usage.output_tokens,
                                    totalTokens: usage.total_tokens,
                                    audioDurationSeconds: lastItem.metadata?.audioDurationSeconds || 0,
                                    input_token_details: usage.input_token_details,
                                    output_token_details: usage.output_token_details,
                                    isFinal: true
                                };
                    
                                await saveMessageToDatabase({
                                    ...lastItem,
                                    role: 'assistant',
                                    status: 'completed',
                                    metadata: messageMetadata
                                }, conversationId);
                    
                                // Log usage directly using apiClient
                                await apiClient.post('/api/logUsage', {
                                    messageId: lastItem.id,
                                    sessionId: currentSessionId,
                                    conversationId,
                                    messageRole: 'assistant',
                                    durationSeconds: Math.round(messageMetadata.audioDurationSeconds || 0),
                                    promptTokens: usage.input_tokens,
                                    completionTokens: usage.output_tokens,
                                    totalTokens: usage.total_tokens,
                                    reportingStatus: 'pending',
                                    metadata: {
                                        input_token_details: usage.input_token_details,
                                        output_token_details: usage.output_token_details
                                    }
                                });
                    
                                console.log('Usage logged:', {
                                    messageId: lastItem.id,
                                    duration: messageMetadata.audioDurationSeconds,
                                    tokens: {
                                        prompt: usage.input_tokens,
                                        completion: usage.output_tokens,
                                        total: usage.total_tokens
                                    }
                                });
                            } catch (error) {
                                console.error('Failed to process completion:', error);
                                toast.error('Failed to process assistant response');
                            }
                        }
                        setIsResponseActive(false);
                    }
                    break;

            // Audio Processing Events
            case 'response.audio.delta':
                try {
                    if (data.delta && data.item_id && wavStreamPlayerRef.current) {
                        const audioData = base64ToInt16Array(data.delta);
                        wavStreamPlayerRef.current.add16BitPCM(audioData, data.item_id);
                    }
                } catch (error) {
                    console.error('Error processing audio delta:', error);
                    handleAudioError(error);
                }
                break;

            case 'response.audio.done':
                if (data.item_id) {
                    console.log('Audio playback completed:', data.item_id);
                }
                break;

            case 'response.audio_transcript.delta':
                if (data.item_id) {
                    // Only log transcript deltas, no special handling needed
                    console.log('Audio transcript delta received for:', data.item_id);
                }
                break;

            case 'response.audio_transcript.done':
                if (data.transcript && data.item_id) {
                    console.log(`Audio transcript completed for ${data.item_id}:`, data.transcript);
                }
                break;

            // Error Handling
            case 'error':
                const errorMessage = data.error?.message || 'Unknown error';
                console.error('WebSocket error:', errorMessage);
                
                if (errorMessage === 'Conversation already has an active response') {
                    console.log('Ignoring duplicate response request');
                    setIsResponseActive(false); // Reset state on duplicate
                } else if (!errorMessage.includes("Cannot update a conversation's voice") && 
                          errorMessage !== 'RealtimeAPI is not connected') {
                    toast.error(`WebSocket Error: ${errorMessage}`);
                }
                break;

            // Rate Limits
            case 'rate_limits.updated':
                console.log('Rate limits updated:', data.rate_limits);
                break;

            default:
                console.log('Unhandled message type:', data.type);
        }
    }, [
        items,
        conversationId,
        sendMessage,
        addUniqueItem,
        saveMessageToDatabase,
        handleAudioError,
        fetchMessages,
        setConversationId,
        wavStreamPlayerRef,
        setIsResponseActive,
        canPushToTalkRef,
        setIsListening,
        isResponseActive,
        setDraftEmail,
        setIsEditingEmail,
        setDraftNote,
        setIsEditingDraft,
        setMemoryKv,
        toast
    ]);

    /**
     * **InitializeAudio Function**
     * Initializes audio recording and playback components.
     */
    const initializeAudio = useCallback(async () => {
        try {
            if (isRecording) {
                try {
                    await wavRecorderRef.current.end();
                    setIsRecording(false);
                } catch (e) {
                    console.warn('Error ending previous recording:', e);
                }
            }
    
            // Initialize stream player first for AI audio playback
            try {
                await wavStreamPlayerRef.current.interrupt();
                await wavStreamPlayerRef.current.connect();
            } catch (e) {
                console.warn('Error initializing stream player:', e);
                return false;
            }
    
            // Then initialize recorder
            try {
                await wavRecorderRef.current.begin();
                return true;
            } catch (e) {
                console.error('Error initializing recorder:', e);
                toast.error('Audio initialization failed');
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            toast.error('Audio initialization failed');
            return false;
        }
    }, [isRecording]);
// Add recording functions:
const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    
    try {
      await wavRecorderRef.current.pause();
      setIsRecording(false);
      
      sendMessage({
        type: 'input_audio_buffer.commit'
      });
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      toast.error('Failed to stop recording');
      await initializeAudio();
    }
  }, [isRecording, initializeAudio, sendMessage]);
  
  const startRecording = useCallback(async () => {
    try {
      if (isRecording) {
        console.warn('Already recording, stopping first...');
        await stopRecording();
        return;
      }
  
      if (!wavRecorderRef.current.processor) {
        const audioInitialized = await initializeAudio();
        if (!audioInitialized) return;
      }
      
      setIsRecording(true);
      await wavRecorderRef.current.record((data: { mono: Int16Array; raw: Int16Array; }) => {
        if (!data?.mono) {
          console.warn('Invalid audio data received');
          return;
        }
    
        if (wsHandler.current?.isConnected()) {
          wsHandler.current.sendMessage({
            type: 'input_audio_buffer.append',
            audio: data.mono
          });
        }
      });
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
      setIsRecording(false);
    }
  }, [isRecording, stopRecording, initializeAudio]);
    /**
     * **Fetch Conversation History via REST API**
     */
    const fetchConversationHistory = useCallback(async (conversationId: string) => {
        try {
            const response = await apiClient.get('/api/getConversationMessages', {
                params: { 
                    conversationId
                },
                headers: {
                    'x-agent-id': agent.id
                }
            });
            setItems(response.data.messages || []);
        } catch (error) {
            console.error('Failed to fetch conversation history:', error);
            toast.error('Failed to load conversation history');
        }
    }, [agent.id]);



    const initAuth = useCallback(async () => {
        try {
          const verifyResponse = await apiClient.get('/api/auth/verify-onboarding-token', {
            params: { agentId: agent.id },
            headers: {
              'x-agent-id': agent.id,
              'Content-Type': 'application/json'
            }
          });
      
          if (verifyResponse.data.success) {
            return verifyResponse.data;
          }
      
          const isAuthEnabled = agent.settings?.authentication?.enabled ?? false;
          
          if (isAuthEnabled) {
            return null;
          }
      
          if (agent.settings?.onboardingType === 'external' && !isAuthEnabled) {
            const authResponse = await apiClient.post('/api/auth/verify-onboarding-password', {
              agentId: agent.id,
              anonymous: true
            }, {
              headers: {
                'x-agent-id': agent.id,
                'Content-Type': 'application/json'
              }
            });
      
            if (authResponse.data.success) {
              const reVerifyResponse = await apiClient.get('/api/auth/verify-onboarding-token', {
                params: { agentId: agent.id },
                headers: {
                  'x-agent-id': agent.id,
                  'Content-Type': 'application/json'
                }
              });
      
              return reVerifyResponse.data;
            }
          }
      
          return null;
      
        } catch (error) {
          // Type check for Axios error
          if (axios.isAxiosError(error)) {
            // Now TypeScript knows this is an AxiosError
            if (error.response?.status === 401) {
              console.debug('Auth check failed - requires authentication');
            } else {
              console.error('Auth initialization failed:', error);
            }
          } else {
            // Handle non-Axios errors
            console.error('Auth initialization failed:', error);
          }
          return null;
        }
      }, [agent.id, agent.settings?.authentication?.enabled, agent.settings?.onboardingType]);
    
    /**
     * **Fetch Sessions**
     * Retrieves available sessions for the agent.
     */
 // Update your existing fetchSessions function
 const fetchSessions = useCallback(async () => {
    if (!agent.id) return;
    
    try {
      setIsLoadingSessions(true);
      
      // Add this new auth initialization
      const authState = await initAuth();
      
      if (!authState?.success && agent.settings?.authentication?.enabled) {
        return; // Let PasswordAuthWrapper handle auth
      }
  
      // Modified getSessions call with both query params and headers
      const response = await apiClient.get('/api/getSessions', {
        params: { agentId: agent.id },  // Add agentId as query param
        headers: {
          'x-agent-id': agent.id,      // Keep header
          'Content-Type': 'application/json'
        },
        withCredentials: true  // Ensure cookies are sent
      });
  
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      if (axios.isAxiosError(error)) {
        console.error('API error details:', error.response?.data);
      }
      toast.error('Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  }, [agent.id, agent.settings?.authentication?.enabled, initAuth]);
    /**
     * **CleanupAudioAndWebSocket Utility Function**
     * Handles cleanup of audio and WebSocket connections.
     */
    const cleanupAudioAndWebSocket = useCallback(async () => {
        try {
            // Stop recording if active
            if (wavRecorderRef.current?.isRecording) {
                try {
                    await wavRecorderRef.current.pause();
                    setIsRecording(false);
                } catch (e) {
                    console.warn('Error stopping recording:', e);
                }
            }
    
            // Clean up audio players in sequence with error handling
            try {
                // Stop any playing audio first
                if (wavStreamPlayerRef.current?.interrupt) {
                    await wavStreamPlayerRef.current.interrupt();
                }
                
                // Then clean up recorder - only call end() if there's an active processor
                if (wavRecorderRef.current?.processor) {
                    await wavRecorderRef.current.end();
                }
            } catch (e) {
                console.warn('Error during audio cleanup:', e);
            }
    
            // Finally disconnect WebSocket
            if (wsHandler.current) {
                try {
                    await wsHandler.current.cleanupAudio();
                    wsHandler.current.disconnect();
                    wsHandler.current = null;
                } catch (e) {
                    console.warn('Error during WebSocket cleanup:', e);
                }
            }
    
            setIsConnected(false);
        } catch (error) {
            console.error('Error during cleanup:', error);
            setIsConnected(false);
            // Don't throw the error since this is cleanup code
            // Just ensure we always set isConnected to false
        }
    }, []);
    /**
     * **Disconnect Conversation**
     * Disconnects the conversation by cleaning up audio and WebSocket connections.
     */
    const disconnectConversation = useCallback(async () => {
        try {
            await cleanupAudioAndWebSocket();
            toast.success('Disconnected successfully');
        } catch (error) {
            console.error('Error during disconnect:', error);
            toast.error('Failed to disconnect cleanly');
        }
    }, [cleanupAudioAndWebSocket]);

    /**
     * **Create New Session**
     * Creates a new session and an initial conversation for the agent.
     */
    const createNewSession = useCallback(async () => {
      if (!agent.id) return null;
      
      try {
          // Clean up any existing audio before creating new session
          if (wavStreamPlayerRef.current) {
              await wavStreamPlayerRef.current.interrupt();
          }
          if (wsHandler.current) {
              await wsHandler.current.cleanupAudio();
          }

          // First create the session
          const sessionResponse = await apiClient.post('/api/createSession', {
              name: `Session ${new Date().toLocaleString()}`,
              type: data.settings?.onboardingType || 'internal',
              agentId: agent.id
          }, {
              headers: {
                  'x-agent-id': agent.id,
                  'Content-Type': 'application/json'
              }
          });
          
          if (sessionResponse.data.error) {
              throw new Error(sessionResponse.data.error);
          }


          const sessionId = sessionResponse.data.sessionId;

          // Then create an initial conversation for this session
          const conversationResponse = await apiClient.post('/api/getOrCreateConversation', {
              sessionId,
              agentId: agent.id
          }, {
              headers: {
                  'x-agent-id': agent.id,
                  'Content-Type': 'application/json'
              }
          });

          if (conversationResponse.data.error) {
              throw new Error(conversationResponse.data.error);
          }

          const conversationId = conversationResponse.data.conversationId;
          
          // Set the conversation ID
          setConversationId(conversationId);

          // Reset states and save session ID
          setCurrentSessionId(sessionId);
          localStorage.setItem('lastSessionId', sessionId);
          setEmailSent(false);
          setNotesTaken(false);
          setNotionMessageSent(false);
          setMemoryKv({});
          setItems([]);
          
          // Initialize audio
          const audioInitialized = await initializeAudio();
          if (!audioInitialized) {
              throw new Error('Audio initialization failed');
          }
          
          // Initialize WebSocket connection with session configuration
          if (wsHandler.current?.isConnected()) {
              await wsHandler.current.sendMessage({
                  type: 'session.update',
                  session: {
                      modalities: ['text', 'audio'],
                      instructions: data.settings?.initialMessage || "I am a helpful assistant.",
                      voice: "alloy",
                      input_audio_format: "pcm16",
                      output_audio_format: "pcm16",
                      input_audio_transcription: {
                          model: "whisper-1"
                      },
                      turn_detection: {
                          type: 'server_vad',
                          threshold: 0.8,
                          prefix_padding_ms: 300,
                          silence_duration_ms: 800
                      },
                      tools: getToolConfigurations(data.settings?.tools || []),
                      tool_choice: "auto",
                      temperature: 0.8,
                      max_response_output_tokens: 4000
                  }
              });
          }
          
          toast.success('New session created');
          await fetchSessions();

          // Now fetch messages for the new conversation
          await fetchMessages(conversationId);
          
          return sessionId;
      } catch (error) {
          console.error('Failed to create session:', error);
          toast.error('Failed to create session');
          return null;
      }
    }, [agent.id, data.settings?.onboardingType, data.settings?.initialMessage, data.settings?.tools, fetchSessions, initializeAudio, fetchMessages]);

    /**
     * **Load Session State**
     * Loads the state of a selected session and fetches its messages.
     */
    const loadSessionState = useCallback(async (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
      
        try {
            // Clean up existing audio state
            if (wavStreamPlayerRef.current) {
                await wavStreamPlayerRef.current.interrupt();
            }
            if (wsHandler.current) {
                await wsHandler.current.cleanupAudio();
            }

            // Get or create conversation for this session
            const conversationResponse = await apiClient.post('/api/getOrCreateConversation', {
                sessionId,
                agentId: agent.id
            }, {
                headers: {
                    'x-agent-id': agent.id
                }
            });

            if (conversationResponse.data.error) {
                throw new Error(conversationResponse.data.error);
            }

            const conversationId = conversationResponse.data.conversationId;
            setConversationId(conversationId); // Set the conversation ID
            console.log('Active conversation ID:', conversationId);
            // Only send voice settings if this is a new conversation
            if (!conversationResponse.data.existingConversation) {
                // Send session config...
                if (wsHandler.current?.isConnected()) {
                    await wsHandler.current.sendMessage({
                        type: 'session.update',
                        session: {
                            modalities: ['text', 'audio'],
                            instructions: data.settings?.initialMessage || "I am a helpful assistant.",
                            voice: "alloy",
                            input_audio_format: "pcm16",
                            output_audio_format: "pcm16",
                            input_audio_transcription: {
                                model: "whisper-1"
                            },
                            turn_detection: {
                                type: 'server_vad',
                                threshold: 0.8,
                                prefix_padding_ms: 300,
                                silence_duration_ms: 800
                            },
                            tools: getToolConfigurations(data.settings?.tools || []),
                            tool_choice: "auto",
                            temperature: 0.8,
                            max_response_output_tokens: 4000
                        }
                    });
                }
            }

            // Reset states
            setEmailSent(false);
            setNotesTaken(false);
            setNotionMessageSent(false);
            setMemoryKv({});

            // Update based on session progress
            session.stepProgress?.steps?.forEach(step => {
                if (step.completed) {
                    switch (step.completionTool) {
                        case 'email':
                            setEmailSent(true);
                            break;
                        case 'notesTaken':
                            setNotesTaken(true);
                            break;
                        case 'notion':
                            setNotionMessageSent(true);
                            break;
                    }
                }
            });

            // Fetch messages for this conversation
            await fetchMessages(conversationId);
        } catch (error) {
            console.error('Failed to load session state:', error);
            toast.error('Failed to load session state');
        }
    }, [sessions, agent.id, data.settings?.initialMessage, data.settings?.tools, fetchMessages]);

    /**
     * **Handle Session Selection**
     * Handles the selection of a session from the sidebar.
     */
    const handleSessionSelect = useCallback(async (sessionId: string) => {
        try {
            setCurrentSessionId(sessionId);
            localStorage.setItem('lastSessionId', sessionId);
            await loadSessionState(sessionId);
        } catch (error) {
            console.error('Failed to switch session:', error);
            toast.error('Failed to switch session');
        }
    }, [loadSessionState]);

    /**
     * **Step Completion Management**
     * Updates the completion status of a step.
     */
    const updateStepStatus = useCallback(async (completionTool: string) => {
        if (!currentSessionId) {
            console.warn('No active session for step update');
            return;
        }
    
        try {
            await axios.post('/api/updateSessionSteps', {
                agentId: agent.id,
                sessionId: currentSessionId,
                completionTool,
                completed: true
            });

            // Update local state based on tool
            switch (completionTool) {
                case 'email':
                    setEmailSent(true);
                    break;
                case 'notesTaken':
                    setNotesTaken(true);
                    break;
                case 'notion':
                    setNotionMessageSent(true);
                    break;
            }

            await fetchSessions();
        } catch (error) {
            console.error('Failed to update step:', error);
            toast.error('Failed to update step completion');
        }
    }, [currentSessionId, agent.id, fetchSessions]);

    /**
     * **Handle WebSocket Message Updates for Function Calls**
     * Enhances the WebSocket message handler to process function calls and trigger UI components.
     */
    // Already implemented above in handleWebSocketMessage

    /**
     * **InitializeAudio Function**
     * Initializes audio recording and playback components.
     */
  

    /**
     * **Connect Conversation Function**
     * Connects the conversation by establishing WebSocket and audio connections.
     */
    const connectConversation = useCallback(async () => {
        try {
            // Clean up any existing connections first
            await cleanupAudioAndWebSocket();

            // Create new WebSocket handler using getInstance
            wsHandler.current = EnhancedWebSocketHandler.getInstance(
               'wss://openai-relay.onboardfi.workers.dev', // Updated WebSocket URL
                agent.id,
                handleWebSocketMessage,
                setIsConnected
            );

            // Safely connect using optional chaining and null checks
            if (!wsHandler.current) {
                throw new Error('Failed to initialize WebSocket handler');
            }

            // Await the WebSocket connection
            await wsHandler.current.connect();

            // Initialize stream player first for AI audio playback
            await wavStreamPlayerRef.current?.interrupt(); // Ensure previous sessions are cleared
            await wavStreamPlayerRef.current.connect();

            // Then initialize recorder
            await wavRecorderRef.current.begin();

            if (conversationId && wsHandler.current) {
                // Get or create conversation for this session
                const conversationResponse = await apiClient.post('/api/getOrCreateConversation', {
                    sessionId: currentSessionId,
                    agentId: agent.id
                }, {
                    headers: {
                        'x-agent-id': agent.id
                    }
                });

                if (conversationResponse.data.error) {
                    throw new Error(conversationResponse.data.error);
                }

                const newConversationId = conversationResponse.data.conversationId;
                setConversationId(newConversationId);

                // Only send voice settings if this is a new conversation
                if (!conversationResponse.data.existingConversation) {
                    // Use type assertion to ensure wsHandler.current is not null
                    const ws = wsHandler.current;
                    await ws.sendMessage({
                        type: 'session.update',
                        session: {
                            modalities: ['text', 'audio'],
                            instructions: data.settings?.initialMessage || "I am a helpful assistant.",
                            voice: "alloy",
                            input_audio_format: "pcm16",
                            output_audio_format: "pcm16",
                            input_audio_transcription: {
                                model: "whisper-1"
                            },
                            turn_detection: {
                                type: 'server_vad',
                                threshold: 0.8,
                                prefix_padding_ms: 300,
                                silence_duration_ms: 800
                            },
                            tools: getToolConfigurations(data.settings?.tools || []),
                            tool_choice: "auto",
                            temperature: 0.8,
                            max_response_output_tokens: 4000
                        }
                    });
                }

                // Fetch any existing messages
                await fetchMessages(newConversationId);
            }

            toast.success('Connected successfully');
        } catch (error) {
            console.error('Connection failed:', error);
            toast.error('Failed to connect conversation');
            // Clean up on error
            await cleanupAudioAndWebSocket();
        }
    }, [
        agent.id, 
        conversationId, 
        currentSessionId, 
        cleanupAudioAndWebSocket, 
        handleWebSocketMessage,
        fetchMessages,
        data.settings?.initialMessage,
        data.settings?.tools
    ]);

    /**
     * **Draft Handlers**
     * Handles sending notes and emails.
     */
    const handleSendNote = useCallback(async () => {
      if (!draftNote || !currentSessionId || !conversationId) {
          console.warn('Missing required data:', {
              hasDraftNote: !!draftNote,
              hasSessionId: !!currentSessionId,
              hasConversationId: !!conversationId
          });
          toast.error('Missing required data to save note');
          return;
      }
      
      try {
          // Add validation for note content
          if (draftNote.trim().length === 0) {
              toast.error('Note content cannot be empty');
              return;
          }
  
          // First validate that required environment variables are set
          const response = await axios.get('/api/validateNotionConfig');
          
          // Then attempt to send the note
          await axios.post('/api/addMessageToNotion', { 
              messageContent: draftNote,
              sessionId: currentSessionId 
          }, {
              // Add timeout and headers
              timeout: 10000,
              headers: {
                  'Content-Type': 'application/json'
              }
          });
          
          setNotesTaken(true);
          setNotionMessageSent(true);
          setDraftNote(null);
  
          toast.success('Note successfully sent to Notion!');
          await updateStepStatus('notion');
  
      } catch (err) {
          // Type guard for Axios errors
          if (axios.isAxiosError(err)) {
              const statusCode = err.response?.status;
              const errorMessage = err.response?.data?.error || err.message;
              
              console.error('Notion API Error:', {
                  statusCode,
                  message: errorMessage,
                  config: err.config,
                  data: err.response?.data
              });
  
              // Handle specific error cases
              switch (statusCode) {
                  case 401:
                      toast.error('Unauthorized: Please check Notion API token');
                      break;
                  case 404:
                      toast.error('Notion page not found');
                      break;
                  case 429:
                      toast.error('Rate limit exceeded. Please try again later.');
                      break;
                  case 400:
                      toast.error(`Invalid request: ${errorMessage}`);
                      break;
                  case 500:
                      toast.error('Server error. Please check Notion configuration.');
                      break;
                  default:
                      toast.error('Failed to add note to Notion. Please try again.');
              }
          } else {
              // Handle non-Axios errors
              console.error('Error sending note to Notion:', err);
              toast.error('Unexpected error while saving note');
          }
  
          // Optionally retry for specific errors
          if (axios.isAxiosError(err) && err.response?.status === 429) {
              // Implement retry logic with exponential backoff
              // This is just an example - you might want to make this more sophisticated
              setTimeout(() => {
                  toast.info('Retrying to send note...');
                  handleSendNote();
              }, 2000);
          }
      }
  }, [draftNote, currentSessionId, conversationId, updateStepStatus]);

    const handleSendEmail = useCallback(async () => {
        if (!draftEmail || !currentSessionId || !conversationId) return;
        
        try {
            console.log('Sending email:', { 
                sessionId: currentSessionId, 
                email: draftEmail 
            });
    
            // Send the email
            await axios.post('/api/send_email', { 
                ...draftEmail,
                sessionId: currentSessionId 
            });
            
            console.log('Email sent, updating step status');
    
            // Update step status
            const response = await axios.post('/api/updateSessionSteps', {
                sessionId: currentSessionId,
                completionTool: 'email',
                completed: true
            });
    
            console.log('Step status updated:', response.data);
            
            setEmailSent(true);
            setDraftEmail(null);
    
            toast.success('Email successfully sent!');
            await updateStepStatus('email');
        } catch (err) {
            console.error('Error in handleSendEmail:', err);
            toast.error('Failed to send email.');
        }
    }, [draftEmail, currentSessionId, conversationId, updateStepStatus]);

    /**
     * **Audio Visualization Effect**
     * Renders audio visualization on canvas elements.
     */
    useEffect(() => {
        let isLoaded = true;
        const wavRecorder = wavRecorderRef.current;
        const wavStreamPlayer = wavStreamPlayerRef.current;

        const render = () => {
            if (!isLoaded) return;

            // Client canvas rendering
            if (clientCanvasRef.current) {
                const canvas = clientCanvasRef.current;
                const ctx = canvas.getContext('2d');

                if (!canvas.width || !canvas.height) {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                }

                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const result = isRecording
                        ? wavRecorder.getFrequencies('voice')
                        : { values: new Float32Array([0]) };
                    
                    WavRenderer.drawBars(
                        canvas,
                        ctx,
                        result.values,
                        data.settings?.primaryColor || "#3b82f6",
                        10,
                        0,
                        8
                    );
                }
            }

            // Server canvas rendering
            if (serverCanvasRef.current) {
                const canvas = serverCanvasRef.current;
                const ctx = canvas.getContext('2d');

                if (!canvas.width || !canvas.height) {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                }

                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const result = wavStreamPlayer.analyser
                        ? wavStreamPlayer.getFrequencies('voice')
                        : { values: new Float32Array([0]) };
                    
                    WavRenderer.drawBars(
                        canvas,
                        ctx,
                        result.values,
                        data.settings?.secondaryColor || "#10b981",
                        10,
                        0,
                        8
                    );
                }
            }

            requestAnimationFrame(render);
        };

        render();
        return () => { isLoaded = false; };
    }, [data.settings?.primaryColor, data.settings?.secondaryColor, isRecording]);

    /**
     * **Initial Setup Effects**
     * Fetches sessions on component mount and loads session state if available.
     */
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        if (currentSessionId) {
            loadSessionState(currentSessionId);
        }
    }, [currentSessionId, loadSessionState]);

    /**
     * **Cleanup Effect**
     * Ensures audio sessions are properly terminated on component unmount.
     */
    useEffect(() => {
        return () => {
            // Cleanup function
            const cleanup = async () => {
                try {
                    await cleanupAudioAndWebSocket();
                } catch (error) {
                    console.error('Cleanup error:', error);
                }
            };
            cleanup();
        };
    }, [cleanupAudioAndWebSocket]);

    /**
     * **Reset isListening When Switching to Manual Mode**
     */
    useEffect(() => {
        if (canPushToTalk) {
            setIsListening(false);
        }
    }, [canPushToTalk]);
// Place this after your other useEffect declarations in AgentConsole
const successfulInit = useRef(false);
// Initialize one-to-one sessions automatically
const initializeOneToOneSession = useCallback(async () => {
    // Use ref to track successful initialization
   
    const initializationKey = `initializing-${agent.id}`;
  
    // Skip if already successfully initialized or currently initializing
    if (successfulInit.current || window.localStorage.getItem(initializationKey)) {
      return;
    }
  
    try {
      // Skip if missing agent info or if sessions are loading
      if (!agent.id || !agent.settings || isLoadingSessions) return;
  
      // Only proceed for one-to-one agents
      const isOneToOne = !agent.settings.allowMultipleSessions;
      if (!isOneToOne) return;
  
      window.localStorage.setItem(initializationKey, 'true');
      setIsLoadingSessions(true);
  
      const isAuthEnabled = agent.settings.authentication?.enabled ?? false;
  
      // Single verification attempt
      try {
        const verifyResponse = await apiClient.get('/api/auth/verify-onboarding-token', {
          headers: {
            'x-agent-id': agent.id,
            'Content-Type': 'application/json'
          },
          params: { agentId: agent.id },
          timeout: 5000
        });
  
        // If auth required, stop and let PasswordAuthWrapper handle it
        if (!verifyResponse.data.success && verifyResponse.data.requiresAuth) {
          console.log('Authentication required for one-to-one session');
          return;
        }
      } catch (error) {
        if (isAuthEnabled) return; // Stop if auth is required
        // Otherwise continue to session check
      }
  
      // Get sessions once
      const sessionsResponse = await apiClient.get('/api/getSessions', {
        headers: { 'x-agent-id': agent.id },
        params: { agentId: agent.id }
      });
  
      const sessions = sessionsResponse.data.sessions || [];
  
      if (sessions.length === 0) {
        // Create new session only if none exists
        const sessionResponse = await apiClient.post('/api/createSession', {
          name: `Session ${new Date().toLocaleString()}`,
          type: agent.settings.onboardingType || 'internal',
          agentId: agent.id
        }, {
          headers: { 'x-agent-id': agent.id }
        });
  
        if (sessionResponse.data.sessionId) {
          setCurrentSessionId(sessionResponse.data.sessionId);
          localStorage.setItem('lastSessionId', sessionResponse.data.sessionId);
          await loadSessionState(sessionResponse.data.sessionId);
        }
      } else {
        // Use existing session
        const sessionId = sessions[0].id;
        setCurrentSessionId(sessionId);
        localStorage.setItem('lastSessionId', sessionId);
        await loadSessionState(sessionId);
      }
  
      // Mark initialization as successful
      successfulInit.current = true;
  
    } catch (error) {
      console.error('Session initialization error:', error);
      toast.error('Failed to initialize session');
    } finally {
      setIsLoadingSessions(false);
      window.localStorage.removeItem(initializationKey);
    }
  }, [
    agent.id,
    agent.settings,
    isLoadingSessions,
    loadSessionState,
    toast
  ]);
  
  // Single execution effect
  useEffect(() => {
    let mounted = true;
    let initializeTimeout: NodeJS.Timeout;
    const initKey = `initialized-${agent.id}`;
  
    // Only run once per agent ID
    if (mounted && !window.localStorage.getItem(initKey)) {
      initializeTimeout = setTimeout(() => {
        initializeOneToOneSession().then(() => {
          // Mark as initialized in localStorage to prevent reruns
          window.localStorage.setItem(initKey, 'true');
        });
      }, 1000);
    }
  
    return () => {
      mounted = false;
      if (initializeTimeout) {
        clearTimeout(initializeTimeout);
      }
      // Clean up only the initialization lock, not the completion flag
      window.localStorage.removeItem(`initializing-${agent.id}`);
    };
  }, [initializeOneToOneSession, agent.id]);
  
  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all initialization related flags on full unmount
      window.localStorage.removeItem(`initialized-${agent.id}`);
      window.localStorage.removeItem(`initializing-${agent.id}`);
    };
  }, [agent.id]);
    /**
     * **JSX Return**
     */return (
    <PasswordAuthWrapper
    agentId={agent.id}
    siteName={agent.name || 'Internal Onboarding'}
    authMessage={agent.settings?.authentication?.message || undefined}
  >
    <TooltipProvider>
      <div className="min-h-screen bg-gray-1100 bg-[url('/grid.svg')]">
        {/* Sidebar */}
        <div className="fixed left-0 top-0 bottom-0 w-96 border-r border-gray-800 bg-black overflow-y-auto">
          <div className="flex-1 flex flex-col">
            <OnboardingProgressSidebar
              emailSent={emailSent}
              notesTaken={notesTaken}
              notionMessageSent={notionMessageSent}
              memoryKv={memoryKv}
              steps={data.settings?.steps || []}
              title={data.name || undefined}
              logo={data.site?.logo || null}
              availableTools={data.settings?.tools || []}
              agentId={data.id}
              onStepsUpdated={fetchSessions}
              primaryColor={data.settings?.primaryColor || '#3b82f6'}
              secondaryColor={data.settings?.secondaryColor || '#10b981'}
              currentSessionId={currentSessionId}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-96 min-h-screen flex flex-col">

<Navbar
  activeTab={activeTab}
  setActiveTab={setActiveTab}
  primaryColor={data.settings?.primaryColor || '#7928CA'}
  secondaryColor={data.settings?.secondaryColor || '#FF0080'}
  tabs={tabs} // Pass tabs to Navbar
/>

          <TabContent
            activeTab={activeTab}
            agentId={agent.id}
            items={items}
            draftNote={draftNote}
            draftEmail={draftEmail}
            isEditingDraft={isEditingDraft}
            isEditingEmail={isEditingEmail}
            handleEditDraft={() => setIsEditingDraft(true)}
            handleEditEmail={() => setIsEditingEmail(true)}
            handleSaveDraft={(draft: string) => {
              setDraftNote(draft);
              setIsEditingDraft(false);
            }}
            handleSaveEmail={(email: DraftEmail) => {
              setDraftEmail(email);
              setIsEditingEmail(false);
            }}
            handleSendNote={handleSendNote}
            handleSendEmail={handleSendEmail}
            setDraftNote={setDraftNote}
            setDraftEmail={setDraftEmail}
            sessions={sessions}
            isLoadingSessions={isLoadingSessions}
            createNewSession={createNewSession}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
            primaryColor={data.settings?.primaryColor || '#7928CA'}
            secondaryColor={data.settings?.secondaryColor || '#FF0080'}
            conversationId={conversationId}
            connectConversation={connectConversation}
            allowMultipleSessions={allowMultipleSessions} // Pass it to TabContent
            draftLead={draftLead}
            isEditingLead={isEditingLead}
            handleEditLead={() => setIsEditingLead(true)}
            handleSaveLead={(lead: DraftLead) => {
              setDraftLead(lead);
              setIsEditingLead(false);
            }}
            handleSendLead={async () => {
              if (!draftLead || !conversationId) return;
              try {
                const leadResponse = await apiClient.post('/api/monday/create-lead', {
                  leadData: draftLead,
                  agentId: agent.id
                }, {
                  headers: {
                    'x-agent-id': agent.id,
                    'Content-Type': 'application/json'
                  }
                });
          
                if (leadResponse.data.success) {
                  toast.success('Lead created in Monday.com');
                  setDraftLead(null);
                  // Update step status if needed
                  await updateStepStatus('monday');
                }
              } catch (error) {
                console.error('Failed to send lead:', error);
                toast.error('Failed to create lead');
              }
            }}
            setDraftLead={setDraftLead}
          />

          <Footer
            isConnected={isConnected}
            isRecording={isRecording}
            canPushToTalk={canPushToTalk}
            connectConversation={connectConversation}
            disconnectConversation={disconnectConversation}
            startRecording={startRecording}
            stopRecording={stopRecording}
            changeTurnEndType={(value: string) =>
              setCanPushToTalk(value === 'none')
            }
            clientCanvasRef={clientCanvasRef}
            serverCanvasRef={serverCanvasRef}
            wavRecorder={wavRecorderRef.current!}
            wavStreamPlayer={wavStreamPlayerRef.current!}
            primaryColor={data.settings?.primaryColor}
            secondaryColor={data.settings?.secondaryColor}
            isListening={isListening}
          />
        </div>
      </div>
    </TooltipProvider>
  </PasswordAuthWrapper>
);
}

export default AgentConsole;