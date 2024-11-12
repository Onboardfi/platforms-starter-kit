
///Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/agent-console/index.tsx
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

// Third-party imports
import { RealtimeClient } from '@openai/realtime-api-beta';
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

function AgentConsole({ agent }: AgentConsoleProps) {
  // Initialize RealtimeClient ref at the top level
  const clientRef = useRef<InstanceType<typeof RealtimeClient>>(
    new RealtimeClient({
      apiKey: typeof window !== 'undefined' 
        ? localStorage.getItem('tmp::voice_api_key') || ''
        : '',
      dangerouslyAllowAPIKeyInBrowser: true,
    })
  );

  // UI State
  const [activeTab, setActiveTab] = useState('workspace');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [data, setData] = useState(agent);
  
  // API Key State
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tmp::voice_api_key') || '';
    }
    return '';
  });

  // Conversation State
  const [items, setItems] = useState<any[]>([]);
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

  // Refs
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

 // **Add this ref to keep track of audio lengths per message**
 const audioLengthsPerMessage = useRef<{ [messageId: string]: number }>({});

  // API Key Management
  const handleApiKeyUpdate = useCallback((newApiKey: string) => {
    setApiKey(newApiKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tmp::voice_api_key', newApiKey);
    }
    
    // Update client with new API key
    clientRef.current = new RealtimeClient({
      apiKey: newApiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
    });
    
    // Reconnect if connected
    if (isConnected) {
      disconnectConversation().then(() => connectConversation());
    }
  }, [isConnected]);

  // Session Management
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

  // Session State Management
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

  // Client Setup Effect
  useEffect(() => {
    const client = clientRef.current;

    const setupClient = () => {
      // Basic session setup
      client.updateSession({ 
        instructions: instructions,
        input_audio_transcription: { model: 'whisper-1' }
      });

      // Set up event handlers
      client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
        setRealtimeEvents(prev => {
          const lastEvent = prev[prev.length - 1];
          if (lastEvent?.event.type === realtimeEvent.event.type) {
            lastEvent.count = (lastEvent.count || 0) + 1;
            return [...prev.slice(0, -1), lastEvent];
          }
          return [...prev, realtimeEvent];
        });
      });

      client.on('conversation.interrupted', async () => {
        const trackSampleOffset = await wavStreamPlayerRef.current.interrupt();
        if (trackSampleOffset?.trackId) {
          await client.cancelResponse(trackSampleOffset.trackId, trackSampleOffset.offset);
        }
      });

     // Update the conversation.updated event handler in AgentConsole.tsx
   // **Update the conversation.updated event handler**
   client.on('conversation.updated', async ({ item, delta }: any) => {
    if (delta?.audio) {
      wavStreamPlayerRef.current.add16BitPCM(delta.audio, item.id);

   // **Accumulate audio length for this message**
   const audioDataLength = delta.audio.length; // Length in bytes

   if (!audioLengthsPerMessage.current[item.id]) {
     audioLengthsPerMessage.current[item.id] = 0;
   }
   audioLengthsPerMessage.current[item.id] += audioDataLength;

   // **Calculate the duration**
   const sampleRate = wavStreamPlayerRef.current.sampleRate;
   const totalAudioLength = audioLengthsPerMessage.current[item.id];
   const durationSeconds = totalAudioLength / (sampleRate * 2); // 2 bytes per sample

   // **Include duration in item metadata**
   item.metadata = item.metadata || {};
   item.metadata.audioDurationSeconds = durationSeconds;
 }




      // **For user messages**
        if (item.status === 'completed' && item.role === 'user') {
          // **Get the recorded duration**
          const durationSeconds = wavRecorderRef.current.getRecordedDuration();

          // **Include duration in item metadata**
          item.metadata = item.metadata || {};
          item.metadata.audioDurationSeconds = durationSeconds;

          // **Reset total samples recorded**
          wavRecorderRef.current.totalSamplesRecorded = 0;
        }
 // **For assistant messages, reset accumulated length when completed**
 if (item.status === 'completed' && item.role === 'assistant') {
  delete audioLengthsPerMessage.current[item.id];
}

      
      if (item.status === 'completed' && item.role) {
        try {
          // Get metadata from stored state
          const clientMetadata = client.metadata || {};
          let effectiveConversationId = clientMetadata.conversationId;
          
          if (!effectiveConversationId) {
            console.warn('No conversation ID found in client metadata');
            
            if (item.metadata?.conversationId) {
              console.log('Found conversation ID in item metadata:', item.metadata.conversationId);
              effectiveConversationId = item.metadata.conversationId;
            } else {
              console.error('No conversation ID available in either source');
              return;
            }
          }
    
          // Log state for debugging
          console.log('Saving message with metadata:', {
            conversationId: effectiveConversationId,
            sessionId: clientMetadata.sessionId,
            agentId: clientMetadata.agentId,
            messageId: item.id,
            role: item.role
          });
    
          // Prepare message data
          const messageData = {
            conversationId: effectiveConversationId,
            message: {
              role: item.role,
              content: {
                text: item.formatted?.text || '',
                transcript: item.formatted?.transcript || '',
                audioUrl: item.formatted?.audio ? `/audio/${item.id}.wav` : undefined
              },
              metadata: {
                ...item.metadata,
                sessionId: clientMetadata.sessionId,
                stepTitle: item.metadata?.stepTitle,
                isFinal: true,
                clientId: clientMetadata.clientId || item.metadata?.clientId,
                toolCalls: item.metadata?.toolCalls || []
              }
            }
          };
    
          // Save message with proper headers
          await axios.post('/api/saveMessage', messageData, {
            headers: {
              'Content-Type': 'application/json',
              'x-agent-id': clientMetadata.agentId || agent.id
            }
          });
          
          console.log('Successfully saved message:', {
            messageId: item.id,
            conversationId: effectiveConversationId,
            agentId: clientMetadata.agentId || agent.id,
            role: item.role
          });
    
        } catch (error) {
          console.error('Failed to save message:', error, {
            itemId: item.id,
            metadata: item.metadata,
            clientMetadata: client.metadata,
            agentId: agent.id
          });
    
          // Enhanced error logging
          if (axios.isAxiosError(error)) {
            console.error('Axios error details:', {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              headers: error.config?.headers
            });
          }
    
          if (error instanceof Error) {
            toast.error(`Failed to save message: ${error.message}`);
          } else {
            toast.error('Failed to save message');
          }
        }
      }
      
    // Update local state
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
  });
      // Add tool setup
      if (agent.settings?.tools) {
        // Email tool
        if (agent.settings.tools.includes('email')) {
          client.addTool(
            {
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
            },
            async ({ to, subject, firstName }: { [key: string]: any }) => {
              setDraftEmail({ to, subject, firstName });
              return { 
                ok: true,
                message: 'Draft email created. You can now review and edit it before sending.'
              };
            }
          );
        }

        // Memory tool
        if (agent.settings.tools.includes('memory')) {
          client.addTool(
            {
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
            },
            async ({ key, value }: { [key: string]: any }) => {
              setMemoryKv(prev => ({
                ...prev,
                [key]: key === 'tasks' ? value.split(',').map((t: string) => t.trim()) : value
              }));
              return { ok: true };
            }
          );
        }

        // Notion tool
        if (agent.settings.tools.includes('notion')) {
          client.addTool(
            {
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
            },
            async ({ messageContent }: { [key: string]: any }) => {
              setDraftNote(messageContent);
              return {
                ok: true,
                message: 'Draft note created. You can now review and edit it before sending.'
              };
            }
          );
        }
      }
    };

    setupClient();

    return () => {
      client.reset();
    };
  }, [agent.id, agent.settings?.tools, instructions]); // Added agent.id to deps

// Connect/Disconnect Handlers

const connectConversation = useCallback(async (sessionId?: string) => {
  const effectiveSessionId = sessionId || currentSessionId;
  if (!effectiveSessionId) {
    toast.error('No active session');
    return;
  }

  if (!apiKey) {
    toast.error('API key not set');
    return;
  }

  try {
    // Create or get conversation
    const conversationResponse = await axios.post('/api/getOrCreateConversation', {
      sessionId: effectiveSessionId,
      agentId: agent.id
    }, {
      headers: {
        'x-agent-id': agent.id
      }
    });
    
    const { conversationId, isNew } = conversationResponse.data;

    // Set up client metadata
    const client = clientRef.current;
    
    // Store metadata in client instance
    client.metadata = {
      sessionId: effectiveSessionId,
      conversationId,
      agentId: agent.id,
      clientId: `${agent.id}-${effectiveSessionId}`,
      timestamp: new Date().toISOString()
    };

    // Update session with metadata and instructions
    await client.updateSession({ 
      metadata: client.metadata,
      instructions,
      input_audio_transcription: { model: 'whisper-1' }
    });
    
    // If existing conversation, load previous messages
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

    // Initialize audio components
    await wavRecorderRef.current.begin();
    await wavStreamPlayerRef.current.connect();
    
    // Connect client
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    await client.connect();

    // Send initial message if new conversation
    if (isNew && agent.settings?.initialMessage) {
      client.sendUserMessageContent([
        { type: 'input_text', text: agent.settings.initialMessage }
      ]);
    }

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorderRef.current.record((data) => 
        client.appendInputAudio(data.mono)
      );
    }

    console.log('Connected to conversation with metadata:', client.metadata);
    toast.success('Connected to conversation!');
    
  } catch (error) {
    console.error('Failed to connect conversation:', error);
    toast.error('Failed to connect to conversation');
    setIsConnected(false);
  }
}, [currentSessionId, agent.id, agent.settings?.initialMessage, apiKey, instructions]);



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
    // No need to get duration here as it's handled in conversation.updated
  };


  // Draft Handlers
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
        clientRef.current.sendUserMessageContent([
          { type: 'input_text', text: 'I just added a note to Notion.' }
        ]);
      }

      toast.success('Note successfully sent to Notion!');
      await updateStepStatus('notion');
    } catch (err) {
      console.error('Error in add_notion_message:', err);
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
        clientRef.current.sendUserMessageContent([
          { type: 'input_text', text: 'I just clicked send email.' }
        ]);
      }

      toast.success('Email successfully sent!');
      await updateStepStatus('email');
    } catch (err) {
      console.error('Error in send_email:', err);
      toast.error('Failed to send email.');
    }
  }, [draftEmail, currentSessionId, updateStepStatus]);

  // Audio Visualization Effect
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

      requestAnimationFrame(render);
    };

    render();
    return () => { isLoaded = false; };
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

  // JSX Return
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
          <Navbar
  LOCAL_RELAY_SERVER_URL={process.env.NEXT_PUBLIC_LOCAL_RELAY_SERVER_URL || ''}
  apiKey={apiKey}
  activeTab={activeTab}
  setActiveTab={setActiveTab}
  onApiKeyUpdate={handleApiKeyUpdate}
  primaryColor={data.settings?.primaryColor || '#7928CA'}
  secondaryColor={data.settings?.secondaryColor || '#FF0080'}
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
  primaryColor={data.settings?.primaryColor || '#7928CA'}  // Added this line
  secondaryColor={data.settings?.secondaryColor || '#FF0080'}
/>

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

export default AgentConsole;