'use client';

// Core React imports
import { useState, useEffect, useRef, useCallback } from 'react';

// Component imports
import { Navbar } from './Navbar';
import { TabContent } from './TabContent';
import { Footer } from './Footer';
import { EmailTemplate } from '@/components/email-template';
import OnboardingProgressSidebar from '@/components/OnboardingProgressCard';

// UI Component imports
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";

// WebSocket and utils imports
import { WebSocketClient } from '@/lib/realtime/websocket-client';
import type { WebSocketMessage, ToolDefinition, ToolCallData } from '@/lib/realtime/types';
import { toast } from 'sonner';
import axios from 'axios';

// Utility imports
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { WavRenderer } from '@/app/utils/wav_renderer';
import { instructions } from '@/app/utils/conversation_config';
import apiClient from '@/lib/api-client';

// Authentication wrapper
import PasswordAuthWrapper from '@/components/auth/PasswordAuthWrapper';

// Type imports
import { 
  AgentConsoleProps, 
  DraftEmail, 
  Session,
  RealtimeEvent 
} from './utils/types';

// Type definitions
interface WebSocketEvent {
  item: {
    id: string;
    role?: string;
    status?: string;
    formatted?: {
      text?: string;
      transcript?: string;
      audio?: ArrayBuffer;
      tool?: {
        name: string;
        arguments: string;
      };
    };
    metadata?: Record<string, any>;
  };
  delta?: {
    audio?: Int16Array;
    transcript?: string;
  };
}

interface MessageData {
  conversationId: string;
  message: {
    role: string;
    content: {
      text: string;
      transcript?: string;
      audioUrl?: string;
    };
    metadata: Record<string, any>;
  };
}

interface ConversationMetadata {
  sessionId: string;
  conversationId: string;
  agentId: string;
  clientId: string;
  timestamp: string;
}

function AgentConsole({ agent }: AgentConsoleProps) {
  // WebSocket client ref
  const clientRef = useRef<WebSocketClient>(new WebSocketClient());

  // UI State
  const [activeTab, setActiveTab] = useState('workspace');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [data, setData] = useState(agent);

  // Conversation State
  const [items, setItems] = useState<WebSocketEvent['item'][]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
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

  // Audio and UI Refs
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Audio Message Tracking
  const audioLengthsPerMessage = useRef<{ [messageId: string]: number }>({});

  // Message Handlers
  const saveMessage = async (item: WebSocketEvent['item']) => {
    try {
      const messageData: MessageData = {
        conversationId: item.metadata?.conversationId || '',
        message: {
          role: item.role || 'user',
          content: {
            text: item.formatted?.text || '',
            transcript: item.formatted?.transcript || '',
            audioUrl: item.formatted?.audio ? `/audio/${item.id}.wav` : undefined
          },
          metadata: {
            ...item.metadata,
            sessionId: currentSessionId,
            isFinal: true,
            clientId: `${agent.id}-${currentSessionId}`,
            toolCalls: item.metadata?.toolCalls || []
          }
        }
      };

      await axios.post('/api/saveMessage', messageData, {
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': agent.id
        }
      });
    } catch (error) {
      console.error('Failed to save message:', error);
      if (error instanceof Error) {
        toast.error(`Failed to save message: ${error.message}`);
      } else {
        toast.error('Failed to save message');
      }
    }
  };

  // WebSocket Event Handler
  const handleConversationEvent = useCallback(({ item, delta }: WebSocketEvent) => {
    if (delta?.audio) {
      wavStreamPlayerRef.current.add16BitPCM(delta.audio, item.id);

      // Calculate audio duration
      const audioDataLength = delta.audio.length;
      if (!audioLengthsPerMessage.current[item.id]) {
        audioLengthsPerMessage.current[item.id] = 0;
      }
      audioLengthsPerMessage.current[item.id] += audioDataLength;

      const sampleRate = wavStreamPlayerRef.current.sampleRate;
      const totalAudioLength = audioLengthsPerMessage.current[item.id];
      const durationSeconds = totalAudioLength / (sampleRate * 2);

      item.metadata = item.metadata || {};
      item.metadata.audioDurationSeconds = durationSeconds;
    }

    if (item.status === 'completed') {
      if (item.role === 'user') {
        const durationSeconds = wavRecorderRef.current.getRecordedDuration();
        item.metadata = item.metadata || {};
        item.metadata.audioDurationSeconds = durationSeconds;
        wavRecorderRef.current.totalSamplesRecorded = 0;
      } else if (item.role === 'assistant') {
        delete audioLengthsPerMessage.current[item.id];
      }
      saveMessage(item);
    }

    setItems(prevItems => {
      const newItems = [...prevItems];
      const index = newItems.findIndex(i => i.id === item.id);
      if (index >= 0) {
        newItems[index] = item;
      } else {
        newItems.push(item);
      }
      return newItems;
    });
  }, [agent.id, currentSessionId]);

// Session Management Functions
const fetchSessions = useCallback(async () => {
  if (!agent.id) return;
  
  try {
    setIsLoadingSessions(true);
    const response = await axios.get(`/api/getSessions?agentId=${agent.id}`);
    setSessions(response.data.sessions || []);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    toast.error('Failed to load sessions');
  } finally {
    setIsLoadingSessions(false);
  }
}, [agent.id]);

const createNewSession = useCallback(async () => {
  if (!agent.id) return null;
  
  try {
    const response = await apiClient.post('/api/createSession', {
      name: `Session ${new Date().toLocaleString()}`,
      type: data.settings?.onboardingType || 'internal',
      agentId: agent.id
    }, {
      headers: {
        'x-agent-id': agent.id,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    const newSessionId = response.data.sessionId;
    
    // Reset states and save session ID
    setCurrentSessionId(newSessionId);
    localStorage.setItem('lastSessionId', newSessionId);
    setEmailSent(false);
    setNotesTaken(false);
    setNotionMessageSent(false);
    setMemoryKv({});
    setItems([]);
    
    // Reset conversation if connected
    if (isConnected) {
      await disconnectConversation();
      await connectConversation(newSessionId);
    }
    
    toast.success('New session created');
    await fetchSessions();
    return newSessionId;
  } catch (error) {
    console.error('Failed to create session:', error);
    toast.error('Failed to create session');
    return null;
  }
}, [agent.id, data.settings?.onboardingType, fetchSessions, isConnected]);

const loadSessionState = useCallback(async (sessionId: string) => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  // Reset states
  setEmailSent(false);
  setNotesTaken(false);
  setNotionMessageSent(false);
  setMemoryKv({});

  // Update based on session progress
  session.stepProgress.steps.forEach(step => {
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
}, [sessions]);

const handleSessionSelect = useCallback(async (sessionId: string) => {
  try {
    setCurrentSessionId(sessionId);
    localStorage.setItem('lastSessionId', sessionId);
    await loadSessionState(sessionId);
    
    if (isConnected) {
      await disconnectConversation();
    }
    await connectConversation(sessionId);
  } catch (error) {
    console.error('Failed to switch session:', error);
    toast.error('Failed to switch session');
  }
}, [loadSessionState, isConnected]);

// Tool Setup Functions
const setupTools = useCallback((client: WebSocketClient) => {
  if (!agent.settings?.tools) return;

  // Email Tool
  if (agent.settings.tools.includes('email')) {
    const emailTool: ToolDefinition = {
      name: 'send_email',
      description: 'Prepare a draft email to send to a new client.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Email address of the recipient.' },
          subject: { type: 'string', description: 'Subject of the email.' },
          firstName: { type: 'string', description: 'First name of the recipient.' }
        },
        required: ['to', 'subject', 'firstName']
      }
    };

    client.addTool(emailTool, async (params) => {
      setDraftEmail(params as DraftEmail);
      return {
        ok: true,
        message: 'Draft email created. You can now review and edit it before sending.'
      };
    });
  }

  // Memory Tool
  if (agent.settings.tools.includes('memory')) {
    const memoryTool: ToolDefinition = {
      name: 'set_memory',
      description: 'Saves important data about the user into memory.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'The key of the memory value. Always use lowercase and underscores.'
          },
          value: {
            type: 'string',
            description: 'Value can be anything represented as a string'
          }
        },
        required: ['key', 'value']
      }
    };

    client.addTool(memoryTool, async ({ key, value }) => {
      setMemoryKv(prev => ({
        ...prev,
        [key]: key === 'tasks' ? value.split(',').map((t: string) => t.trim()) : value
      }));
      return { ok: true };
    });
  }

  // Notion Tool
  if (agent.settings.tools.includes('notion')) {
    const notionTool: ToolDefinition = {
      name: 'add_notion_message',
      description: 'Prepare a draft message or note to potentially add to a specified Notion page.',
      parameters: {
        type: 'object',
        properties: {
          messageContent: {
            type: 'string',
            description: 'The content of the draft message or note.'
          }
        },
        required: ['messageContent']
      }
    };

    client.addTool(notionTool, async ({ messageContent }) => {
      setDraftNote(messageContent);
      return {
        ok: true,
        message: 'Draft note created. You can now review and edit it before sending.'
      };
    });
  }
}, []);

// Step Completion Management
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
// Connection and Conversation Management
const connectConversation = useCallback(async (sessionId?: string) => {
  const effectiveSessionId = sessionId || currentSessionId;
  if (!effectiveSessionId) {
    toast.error('No active session');
    return;
  }

  try {
    // Get or create conversation ID
    const conversationResponse = await axios.post('/api/getOrCreateConversation', {
      sessionId: effectiveSessionId,
      agentId: agent.id
    }, {
      headers: {
        'x-agent-id': agent.id
      }
    });
    
    const { conversationId, isNew } = conversationResponse.data;

    // Initialize audio components
    await wavRecorderRef.current.begin();
    await wavStreamPlayerRef.current.connect();

    // Connect WebSocket client
    await clientRef.current.connect();

    // Send initialization data
    clientRef.current.send({
      type: 'connect',
      data: {
        metadata: {
          sessionId: effectiveSessionId,
          conversationId,
          agentId: agent.id,
          clientId: `${agent.id}-${effectiveSessionId}`,
          timestamp: new Date().toISOString()
        },
        instructions,
        input_audio_transcription: { model: 'whisper-1' }
      }
    });

    // Load existing messages if needed
    if (!isNew) {
      try {
        const messagesResponse = await axios.get(
          `/api/getConversationMessages?conversationId=${conversationId}&sessionId=${effectiveSessionId}`,
          {
            headers: {
              'x-agent-id': agent.id
            }
          }
        );
        setItems(messagesResponse.data.messages || []);
      } catch (error) {
        console.error('Failed to load conversation messages:', error);
        toast.error('Failed to load previous messages');
      }
    }

    setIsConnected(true);
    setRealtimeEvents([]);
    
    // Send initial message if new conversation
    if (isNew && agent.settings?.initialMessage) {
      clientRef.current.send({
        type: 'user_message',
        data: [{ type: 'input_text', text: agent.settings.initialMessage }]
      });
    }

    toast.success('Connected to conversation!');
  } catch (error) {
    console.error('Failed to connect conversation:', error);
    toast.error('Failed to connect to conversation');
    setIsConnected(false);
  }
}, [currentSessionId, agent.id, agent.settings?.initialMessage, instructions]);

const disconnectConversation = useCallback(async () => {
  try {
    setIsConnected(false);
    setItems([]);
    await wavRecorderRef.current.end();
    await wavStreamPlayerRef.current.interrupt();
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    toast.info('Disconnected from conversation.');
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
}, []);

// Recording Handlers
const startRecording = async () => {
  if (!clientRef.current) return;
  setIsRecording(true);
  await wavRecorderRef.current.record((data) => 
    clientRef.current?.appendInputAudio(data.mono)
  );
};

const stopRecording = async () => {
  if (!clientRef.current) return;
  setIsRecording(false);
  await wavRecorderRef.current.pause();
  clientRef.current.createResponse();
};

// Draft Message Handlers
const handleSendNote = useCallback(async () => {
  if (!draftNote || !currentSessionId) return;
  
  try {
    await axios.post('/api/addMessageToNotion', { 
      messageContent: draftNote,
      sessionId: currentSessionId 
    });
    
    setNotesTaken(true);
    setNotionMessageSent(true);
    setDraftNote(null);

    if (clientRef.current) {
      clientRef.current.send({
        type: 'user_message',
        data: [{ type: 'input_text', text: 'I just added a note to Notion.' }]
      });
    }

    toast.success('Note successfully sent to Notion!');
    await updateStepStatus('notion');
  } catch (error) {
    console.error('Error in add_notion_message:', error);
    toast.error('Failed to add note to Notion.');
  }
}, [draftNote, currentSessionId, updateStepStatus]);

const handleSendEmail = useCallback(async () => {
  if (!draftEmail || !currentSessionId) return;
  
  try {
    await axios.post('/api/send_email', { 
      ...draftEmail,
      sessionId: currentSessionId 
    });
    
    setEmailSent(true);
    setDraftEmail(null);

    if (clientRef.current) {
      clientRef.current.send({
        type: 'user_message',
        data: [{ type: 'input_text', text: 'I just clicked send email.' }]
      });
    }

    toast.success('Email successfully sent!');
    await updateStepStatus('email');
  } catch (error) {
    console.error('Error in send_email:', error);
    toast.error('Failed to send email.');
  }
}, [draftEmail, currentSessionId, updateStepStatus]);

// Client Setup Effect
useEffect(() => {
  const client = clientRef.current;

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    setRealtimeEvents(prev => {
      const lastEvent = prev[prev.length - 1];
      if (lastEvent?.event.type === event.event.type) {
        return [...prev.slice(0, -1), { 
          ...lastEvent, 
          count: (lastEvent.count || 0) + 1 
        }];
      }
      return [...prev, event];
    });
  };

  const handleConversationInterrupted = async () => {
    const trackSampleOffset = await wavStreamPlayerRef.current.interrupt();
    if (trackSampleOffset?.trackId) {
      await client.cancelResponse(
        trackSampleOffset.trackId, 
        trackSampleOffset.offset
      );
    }
  };

  const setupClient = () => {
    // Basic session setup
    client.updateSession({ 
      instructions: instructions,
      input_audio_transcription: { model: 'whisper-1' }
    });

    // Set up event handlers
    client.on('realtime.event', handleRealtimeEvent);
    client.on('conversation.interrupted', handleConversationInterrupted);
    client.on('conversation.updated', handleConversationEvent);

    // Setup tools if available
    if (agent.settings?.tools) {
      setupTools(client);
    }
  };

  setupClient();

  return () => {
    client.disconnect();
  };
}, [
  agent.id, 
  agent.settings?.tools, 
  instructions, 
  handleConversationEvent, 
  setupTools
]);

// Audio Visualization Effect
useEffect(() => {
  let isLoaded = true;
  const wavRecorder = wavRecorderRef.current;
  const wavStreamPlayer = wavStreamPlayerRef.current;

  const renderVisualizations = () => {
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
        const result = wavRecorder.recording
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

    requestAnimationFrame(renderVisualizations);
  };

  renderVisualizations();

  return () => { 
    isLoaded = false; 
  };
}, [data.settings?.primaryColor, data.settings?.secondaryColor]);

// Initial Setup Effects
useEffect(() => {
  fetchSessions();
}, [fetchSessions]);

useEffect(() => {
  if (currentSessionId) {
    loadSessionState(currentSessionId);
  }
}, [currentSessionId, loadSessionState]);

// Component Render
return (
  <PasswordAuthWrapper 
    agentId={agent.id}
    siteName={agent.name || "Internal Onboarding"}
    authMessage={agent.settings.authentication?.message}
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
              primaryColor={data.settings?.primaryColor || "#3b82f6"}
              secondaryColor={data.settings?.secondaryColor || "#10b981"}
              currentSessionId={currentSessionId}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-96 min-h-screen flex flex-col">
          {/* Navbar */}
          <Navbar
            LOCAL_RELAY_SERVER_URL={process.env.NEXT_PUBLIC_LOCAL_RELAY_SERVER_URL || ''}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            primaryColor={data.settings?.primaryColor || '#7928CA'}
            secondaryColor={data.settings?.secondaryColor || '#FF0080'}
          />

          {/* Tab Content */}
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
          />

          {/* Footer */}
          <Footer
            isConnected={isConnected}
            isRecording={isRecording}
            canPushToTalk={canPushToTalk}
            connectConversation={() => connectConversation()}
            disconnectConversation={disconnectConversation}
            startRecording={startRecording}
            stopRecording={stopRecording}
            changeTurnEndType={(value: string) => setCanPushToTalk(value === 'none')}
            clientCanvasRef={clientCanvasRef}
            serverCanvasRef={serverCanvasRef}
            wavRecorder={wavRecorderRef.current!}
            wavStreamPlayer={wavStreamPlayerRef.current!}
            primaryColor={data.settings?.primaryColor}
            secondaryColor={data.settings?.secondaryColor}
          />
        </div>
      </div>
    </TooltipProvider>
  </PasswordAuthWrapper>
);
}

// Export
export default AgentConsole;