'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from "next/image";
import axios from 'axios';
import { toast } from 'sonner';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";


import { Input } from "@/components/ui/input";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { X, Edit, Zap, Settings, Mic, Send } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";


import OnboardingProgressCard from '@/components/OnboardingProgressCard';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { instructions } from '@/app/utils/conversation_config.js';
import { WavRenderer } from '@/app/utils/wav_renderer';
import Spline from '@splinetool/react-spline';
import { Toggle } from '@/components/toggle/Toggle';
import { EmailTemplate } from '@/components/email-template';
import { AgentSettings, Step } from '@/lib/types';

interface Agent {
  id: string;
  name: string | null;
  description: string | null;
  slug: string;
  userId: string | null;
  siteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
  settings: AgentSettings;
  logo?: string | null;
}

interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

interface DraftEmail {
  to: string;
  subject: string;
  firstName: string;
}

const fadeAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};
// First, let's create a separate Navbar component
const Navbar = ({ setSidebarOpen }: { setSidebarOpen: (open: boolean) => void }) => {
  return (
    <div className="sticky top-0 z-10 flex h-16 bg-black border-b border-gray-800">
      <button
        type="button"
        className="px-4 border-r border-gray-800 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
       
      </button>
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          {/* Add any navbar content here */}
        </div>
      </div>
    </div>
  );
};
function AgentConsole({ agent }: { agent: Agent }) {
  // Tab state
  const [activeTab, setActiveTab] = useState('workspace');
  
  // Core states
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});
  
  // Draft states
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState<DraftEmail | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  
  // Progress states
  const [emailSent, setEmailSent] = useState(false);
  const [notesTaken, setNotesTaken] = useState(false);
  const [notionMessageSent, setNotionMessageSent] = useState(false);
  const [data, setData] = useState<Agent>(agent);

  // Refs
  const wavRecorderRef = useRef<WavRecorder>(new WavRecorder({ sampleRate: 24000 }));
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(new WavStreamPlayer({ sampleRate: 24000 }));
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());
  
  // Client setup
  const LOCAL_RELAY_SERVER_URL = process.env.NEXT_PUBLIC_LOCAL_RELAY_SERVER_URL || '';
  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ''
    : typeof window !== 'undefined'
    ? localStorage.getItem('tmp::voice_api_key') || prompt('OpenAI API Key') || ''
    : '';

  const clientRef = useRef<InstanceType<typeof RealtimeClient>>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  // Extract theme colors
  const primaryColor = agent.settings?.primaryColor || "#3b82f6";
  const secondaryColor = agent.settings?.secondaryColor || "#10b981";

  const tabs = [
    { name: 'Workspace', id: 'workspace' },
    { name: 'Conversation', id: 'conversation' },
    { name: 'Integrations', id: 'integrations' }
  ];

  // Fetch agent data
  const fetchAgentData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/getAgent?agentId=${agent.id}`);
      if (response.data.agent) {
        setData(response.data.agent);
      }
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
    }
  }, [agent.id]);

  // Update step status
  const updateStepStatus = useCallback(async (completionTool: string) => {
    const steps = data.settings.steps ?? [];
    const stepIndex = steps.findIndex(step => step.completionTool === completionTool);

    if (stepIndex !== -1) {
      const updatedSteps = steps.map((step, index) =>
        index === stepIndex ? { ...step, completed: true } : step
      );

      try {
        const response = await fetch('/api/updateAgentSteps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: data.id,
            steps: updatedSteps,
          }),
        });

        const result = await response.json();
        if (result.success) {
          await fetchAgentData();
        }
      } catch (error) {
        console.error('Failed to update step:', error);
      }
    }
  }, [data.id, data.settings.steps, fetchAgentData]);

  // Draft handling
  const handleEditDraft = useCallback(() => setIsEditingDraft(true), []);
  const handleEditEmail = useCallback(() => setIsEditingEmail(true), []);

  const handleSaveDraft = useCallback((editedDraft: string) => {
    setDraftNote(editedDraft);
    setIsEditingDraft(false);
  }, []);

  const handleSaveEmail = useCallback((editedEmail: DraftEmail) => {
    setDraftEmail(editedEmail);
    setIsEditingEmail(false);
  }, []);

  // Send handlers
  const handleSendNote = useCallback(async () => {
    if (draftNote) {
      try {
        await axios.post('/api/addMessageToNotion', { messageContent: draftNote });
        setNotesTaken(true);
        setNotionMessageSent(true);
        setDraftNote(null);
        
        clientRef.current.sendUserMessageContent([
          { type: 'input_text', text: 'I just added a note to Notion.' }
        ]);
        
        toast.success('Note successfully sent to Notion!');
        await updateStepStatus('notion');
      } catch (err) {
        console.error('Error in add_notion_message:', err);
        toast.error('Failed to add note to Notion.');
      }
    }
  }, [draftNote, updateStepStatus]);

  const handleSendEmail = useCallback(async () => {
    if (draftEmail) {
      try {
        await axios.post('/api/send_email', draftEmail);
        setEmailSent(true);
        setDraftEmail(null);

        clientRef.current.sendUserMessageContent([
          { type: 'input_text', text: 'I just clicked send email.' }
        ]);

        toast.success('Email successfully sent!');
        await updateStepStatus('email');
      } catch (err) {
        console.error('Error in send_email:', err);
        toast.error('Failed to send email.');
      }
    }
  }, [draftEmail, updateStepStatus]);

  // Connection handlers
  const connectConversation = useCallback(async () => {
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(clientRef.current.conversation.getItems());

    await wavRecorderRef.current.begin();
    await wavStreamPlayerRef.current.connect();
    await clientRef.current.connect();

    const initialMessage = agent.settings?.initialMessage || 'Hello!';
    clientRef.current.sendUserMessageContent([
      { type: 'input_text', text: initialMessage }
    ]);

    if (clientRef.current.getTurnDetectionType() === 'server_vad') {
      await wavRecorderRef.current.record((data) => 
        clientRef.current.appendInputAudio(data.mono)
      );
    }
  }, [agent.settings?.initialMessage]);

  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setMemoryKv({});
    setEmailSent(false);
    setNotesTaken(false);
    setNotionMessageSent(false);

    clientRef.current.disconnect();
    await wavRecorderRef.current.end();
    await wavStreamPlayerRef.current.interrupt();
  }, []);

  // Recording handlers
  const startRecording = async () => {
    setIsRecording(true);
    const trackSampleOffset = await wavStreamPlayerRef.current.interrupt();
    if (trackSampleOffset?.trackId) {
      await clientRef.current.cancelResponse(
        trackSampleOffset.trackId,
        trackSampleOffset.offset
      );
    }
    await wavRecorderRef.current.record((data) => 
      clientRef.current.appendInputAudio(data.mono)
    );
  };

  const stopRecording = async () => {
    setIsRecording(false);
    await wavRecorderRef.current.pause();
    clientRef.current.createResponse();
  };

  const changeTurnEndType = async (value: string) => {
    if (value === 'none' && wavRecorderRef.current.getStatus() === 'recording') {
      await wavRecorderRef.current.pause();
    }
    
    clientRef.current.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });
    
    if (value === 'server_vad' && clientRef.current.isConnected()) {
      await wavRecorderRef.current.record((data) => 
        clientRef.current.appendInputAudio(data.mono)
      );
    }
    setCanPushToTalk(value === 'none');
  };

  // Effects
  useEffect(() => {
    if (apiKey !== '' && typeof window !== 'undefined') {
      localStorage.setItem('tmp::voice_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchAgentData();
  }, [fetchAgentData]);

// Client setup effect
useEffect(() => {
  const client = clientRef.current;

  const setupClient = () => {
    client.updateSession({ 
      instructions: instructions,
      input_audio_transcription: { model: 'whisper-1' }
    });

    client.on('connected', () => {
      const initialMessage = agent.settings?.initialMessage || 'Hello!';
      client.sendUserMessageContent([
        { type: 'input_text', text: initialMessage }
      ]);
    });

    // Tool setup
    if (agent.settings?.tools) {
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

      // Event handlers
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

      client.on('error', console.error);

      client.on('conversation.interrupted', async () => {
        const trackSampleOffset = await wavStreamPlayerRef.current.interrupt();
        if (trackSampleOffset?.trackId) {
          await client.cancelResponse(trackSampleOffset.trackId, trackSampleOffset.offset);
        }
      });

      client.on('conversation.updated', async ({ item, delta }: any) => {
        const wavStreamPlayer = wavStreamPlayerRef.current;
        const items = client.conversation.getItems();
        
        if (delta?.audio) {
          wavStreamPlayer.add16BitPCM(delta.audio, item.id);
        }
        
        if (item.status === 'completed' && item.formatted.audio?.length) {
          const wavFile = await WavRecorder.decode(item.formatted.audio, 24000, 24000);
          item.formatted.file = wavFile;
        }
        
        setItems(items);
      });

      setItems(client.conversation.getItems());
    };

    setupClient();

    // Cleanup function
    return () => {
      client.reset();
    };
  }, [agent.settings?.tools, instructions]);
  // Audio visualization effect
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
            primaryColor,
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
            secondaryColor,
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
  }, [primaryColor, secondaryColor]);

  return (
    <TooltipProvider>
<div className="min-h-screen bg-gray-1100 bg-[url('/grid.svg')]">
{/* Fixed Left Sidebar */}
        <div className="fixed left-0 top-0 bottom-0 w-96 border-r border-gray-800 bg-black overflow-y-auto">
          <div className="flex-1 flex flex-col">
         
            <OnboardingProgressCard
              emailSent={emailSent}
              notesTaken={notesTaken}
              notionMessageSent={notionMessageSent}
              memoryKv={memoryKv}
              headingText={agent.settings?.headingText}
              availableTools={agent.settings?.tools || []}
              steps={data.settings?.steps || []}
              agentId={agent.id}
              onStepsUpdated={fetchAgentData}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          </div>
        </div>
  
        {/* Main Content */}
        <div className="ml-96 min-h-screen flex flex-col">
          {/* Banner and Profile Section */}
          <div>
            <div className={`h-48 w-full lg:h-16 `} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-16">
              <div className="flex items-end space-x-5">
                {/* Avatar */}
              
  
                {/* Name and Actions */}
               
              </div>
            </div>
          </div>
  
       {/* Tabs Section */}
<div className="border-b bg-black border-gray-800 mt-3">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <nav className="-mb-px flex items-center justify-between" aria-label="Tabs">
      <div className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm font-mono transition-colors",
              activeTab === tab.id
                ? "border-white text-white"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* API Key Button moved to tabs */}
      {!LOCAL_RELAY_SERVER_URL && (
        <Tooltip>
          <TooltipTrigger asChild>


        
            <Button
           variant={isConnected ? "outline" : "default"}
              size="sm"
              onClick={() => {
                const newApiKey = prompt('Enter new OpenAI API Key');
                if (newApiKey) {
                  localStorage.setItem('tmp::voice_api_key', newApiKey);
                  window.location.reload();
                }
              }}
           className="h-8 text-xs flex items-center"
            >
              <Edit className="h-3 w-3 mr-2" />
              API Key: {apiKey.slice(0, 3)}...
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Click to update API key</p>
          </TooltipContent>
        </Tooltip>
      )}
    </nav>
  </div>
</div>{/* Tabs Section */}
  
          {/* Tab Content */}
          <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={fadeAnimation}
                className="h-full"
              >
             {activeTab === 'workspace' ? (
        // Workspace Tab
        <Card className="bg-black border border-gray-800">
          <CardContent className="p-6">
            {!draftNote && !draftEmail ? (
              <div className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
                <div className="relative h-[620px] rounded-lg overflow-hidden bg-black">
                  <Spline scene="https://prod.spline.design/tFMrNZoJ2kX1j83X/scene.splinecode" />
                </div>
              </div>
            ) : (
                        <div className="space-y-6">
                          {/* Draft Note */}
                          {draftNote && (
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold text-white font-mono">Draft Note</h3>
                              {isEditingDraft ? (
                                <textarea
                                  value={draftNote}
                                  onChange={(e) => setDraftNote(e.target.value)}
                                  className="w-full min-h-[200px] bg-dark-accent-1 border border-gray-800 rounded-lg p-4 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white"
                                />
                              ) : (
                                <div className="bg-dark-accent-1 border border-gray-800 rounded-lg p-4">
                                  <p className="text-white font-mono text-sm whitespace-pre-wrap">
                                    {draftNote}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-end space-x-4">
                                <Button
                                  variant="outline"
                                  onClick={isEditingDraft ? () => handleSaveDraft(draftNote) : handleEditDraft}
                                  className="font-mono"
                                >
                                  {isEditingDraft ? "Save Changes" : "Edit Note"}
                                </Button>
                                <Button
                                  onClick={handleSendNote}
                                  className="font-mono"
                                >
                                  Send to Notion
                                </Button>
                              </div>
                            </div>
                          )}
  
                          {/* Draft Email */}
                          {draftEmail && (
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold text-white font-mono">Draft Email</h3>
                              {isEditingEmail ? (
                                <div className="space-y-4">
                                  <Input
                                    type="email"
                                    value={draftEmail.to}
                                    onChange={(e) => setDraftEmail({
                                      ...draftEmail,
                                      to: e.target.value
                                    })}
                                    placeholder="Recipient Email"
                                    className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                                  />
                                  <Input
                                    type="text"
                                    value={draftEmail.subject}
                                    onChange={(e) => setDraftEmail({
                                      ...draftEmail,
                                      subject: e.target.value
                                    })}
                                    placeholder="Subject"
                                    className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                                  />
                                  <Input
                                    type="text"
                                    value={draftEmail.firstName}
                                    onChange={(e) => setDraftEmail({
                                      ...draftEmail,
                                      firstName: e.target.value
                                    })}
                                    placeholder="Recipient First Name"
                                    className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="bg-dark-accent-1 border border-gray-800 rounded-lg p-4">
                                    <div className="space-y-2 text-sm font-mono">
                                      <div className="flex">
                                        <span className="text-gray-400 w-20">To:</span>
                                        <span className="text-white">{draftEmail.to}</span>
                                      </div>
                                      <div className="flex">
                                        <span className="text-gray-400 w-20">Subject:</span>
                                        <span className="text-white">{draftEmail.subject}</span>
                                      </div>
                                      <div className="flex">
                                        <span className="text-gray-400 w-20">Name:</span>
                                        <span className="text-white">{draftEmail.firstName}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-dark-accent-1 border border-gray-800 rounded-lg p-4">
                                    <EmailTemplate firstName={draftEmail.firstName} />
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-end space-x-4">
                                <Button
                                  variant="outline"
                                  onClick={isEditingEmail ? () => handleSaveEmail(draftEmail) : handleEditEmail}
                                  className="font-mono"
                                >
                                  {isEditingEmail ? "Save Changes" : "Edit Email"}
                                </Button>
                                <Button
                                  onClick={handleSendEmail}
                                  className="font-mono"
                                >
                                  Send Email
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                     
               )}
          </CardContent>
        </Card>
      ) : activeTab === 'conversation' ? (
                  <Card className="bg-black border border-gray-800">
                    <CardContent className="p-6">
                      <ScrollArea className="h-[600px]">
                        {!items.length ? (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400 font-mono text-sm">
                              Waiting for connection...
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {items.map((item, i) => (
                              <div
                                key={item.id || i}
                                className={cn(
                                  "flex",
                                  item.role === "assistant" ? "justify-start" : "justify-end"
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[80%] px-4 py-2 rounded-lg font-mono text-sm",
                                    item.role === "assistant" 
                                      ? "bg-dark-accent-1 text-white" 
                                      : "bg-dark-accent-2 text-white"
                                  )}
                                >
                                  {item.formatted.transcript || item.formatted.text || "(Truncated)"}
                                </div>
                              </div>
                           ))}
                           </div>
                         )}
                       </ScrollArea>
                     </CardContent>
                   </Card>
          ) : (
              
            <div className="space-y-8">
            {/* CRM Category */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">CRM Systems</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: "Salesforce",
                    description: "Connect with Salesforce to sync customer data, opportunities, and accounts.",
                    category: "crm",
                    status: "disconnected",
                    color: "blue"
                  },
                  {
                    name: "HubSpot",
                    description: "Integrate with HubSpot CRM for seamless contact and deal management.",
                    category: "crm",
                    status: "disconnected",
                    color: "blue"
                  },
                  {
                    name: "Pipedrive",
                    description: "Sync your sales pipeline and contact data with Pipedrive CRM.",
                    category: "crm",
                    status: "disconnected",
                    color: "blue"
                  }
                ].map((integration) => (
                  <div key={integration.name} className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
                    <div className="bg-black rounded-lg p-4 h-full flex flex-col">
                      <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 relative overflow-hidden">
  <Image
    src={`/${integration.name}.png`}
    alt={`${integration.name} logo`}
    fill
    className="object-cover p-2"
  />
</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-white truncate">{integration.name}</h3>
                            {integration.status === 'connected' && (
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full',
                                {
                                  'bg-vercel-blue text-white': integration.color === 'blue',
                                  'bg-vercel-cyan text-white': integration.color === 'cyan',
                                  'bg-vercel-orange text-white': integration.color === 'orange'
                                }
                              )}>
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">{integration.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant={integration.status === 'connected' ? "destructive" : "outline"}
                          size="sm"
                          className="flex-1 text-xs h-8"
                        >
                          {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 w-20"
                        >
                          Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        
            {/* Communication Category */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Communication Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: "Slack",
                    description: "Send notifications and updates directly to your Slack channels.",
                    category: "communication",
                    status: "disconnected",
                    color: "violet"
                  },
                 
                  {
                    name: "Gmail",
                    description: "Integrate your email communications and manage draft emails.",
                    category: "communication",
                    status: "connected",
                    color: "orange"
                  }
                ].map((integration) => (
                  <div key={integration.name} className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
                    <div className="bg-black rounded-lg p-4 h-full flex flex-col">
                      <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 relative overflow-hidden">
  <Image
    src={`/${integration.name}.png`}
    alt={`${integration.name} logo`}
    fill
    className="object-cover p-2"
  />
</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-white truncate">{integration.name}</h3>
                            {integration.status === 'connected' && (
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full',
                                {
                                  'bg-vercel-blue text-white': integration.color === 'blue',
                                  'bg-vercel-violet text-white': integration.color === 'violet',
                                  'bg-vercel-orange text-white': integration.color === 'orange'
                                }
                              )}>
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">{integration.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant={integration.status === 'connected' ? "destructive" : "outline"}
                          size="sm"
                          className="flex-1 text-xs h-8"
                        >
                          {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 w-20"
                        >
                          Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        
            {/* Productivity Category */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Productivity Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: "Notion",
                    description: "Sync notes and documentation directly with your Notion workspace.",
                    category: "productivity",
                    status: "connected",
                    color: "cyan"
                  },
                  {
                    name: "Trello",
                    description: "Manage tasks and projects with Trello integration.",
                    category: "productivity",
                    status: "disconnected",
                    color: "blue"
                  },
                  {
                    name: "Asana",
                    description: "Connect with Asana for project and task management.",
                    category: "productivity",
                    status: "disconnected",
                    color: "pink"
                  }
                ].map((integration) => (
                  <div key={integration.name} className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
                    <div className="bg-black rounded-lg p-4 h-full flex flex-col">
                      <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 relative overflow-hidden">
  <Image
    src={`/${integration.name}.png`}
    alt={`${integration.name} logo`}
    fill
    className="object-cover p-2"
  />
</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-white truncate">{integration.name}</h3>
                            {integration.status === 'connected' && (
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full',
                                {
                                  'bg-vercel-blue text-white': integration.color === 'blue',
                                  'bg-vercel-cyan text-white': integration.color === 'cyan',
                                  'bg-vercel-pink text-white': integration.color === 'pink'
                                }
                              )}>
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">{integration.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant={integration.status === 'connected' ? "destructive" : "outline"}
                          size="sm"
                          className="flex-1 text-xs h-8"
                        >
                          {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 w-20"
                        >
                          Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
          
            </div>
          </div>
        </div>
      )}
    </motion.div>
  </AnimatePresence>
</div>

          <footer className="mt-auto">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
      <div className="flex flex-col space-y-4 rounded-lg bg-black p-4 lg:p-5">
        {/* Conversation Controls */}
        <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 lg:space-x-6">
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            onClick={isConnected ? disconnectConversation : connectConversation}
            className="h-8 text-xs flex items-center"
          >
            {isConnected ? (
              <X className="h-4 w-4 mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isConnected ? "Disconnect" : "Connect"}
          </Button>

          <div className="flex items-center space-x-2">
            <Switch
              checked={!canPushToTalk}
              onCheckedChange={(checked) => 
                changeTurnEndType(checked ? "server_vad" : "none")
              }
            />
            <span className="text-sm text-gray-400 font-mono">
              {canPushToTalk ? "Manual" : "Voice Activity Detection"}
            </span>
          </div>

          {isConnected && canPushToTalk && (
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              disabled={!isConnected || !canPushToTalk}
              className="h-8 text-xs flex items-center"
            >
              <Mic className="h-4 w-4 mr-2" />
              {isRecording ? "Release to Send" : "Push to Talk"}
            </Button>
          )}
        </div>

       {/* Visualizations */}
       <div className="grid grid-cols-2 gap-4">
          <div className="relative rounded-lg p-1">
            <div className="absolute -top-3 left-2 text-xs text-gray-400 bg-black px-1 rounded">
         
            </div>
            <canvas ref={clientCanvasRef} className="w-full h-8" />
          </div>
          <div className="relative rounded-lg p-1">
            <div className="absolute -top-3 left-2 text-xs text-gray-400 bg-black px-1 rounded">
           
            </div>
            <canvas ref={serverCanvasRef} className="w-full h-8" />
          </div>
        </div>
      </div>
    </div>
    {/* API Key Button - Moved outside the gradient border */}
  
  </div>
</footer>

        </div>
  
        {/* API Key Button */}
       
      </div>
    </TooltipProvider>
  );
}

// Add these utility components if they don't exist
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

  export default AgentConsole; 