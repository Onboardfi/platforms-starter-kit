
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import axios from 'axios';

import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { instructions } from '@/app/utils/conversation_config.js';
import { WavRenderer } from '@/app/utils/wav_renderer';
import OnboardingProgressCard from './OnboardingProgressCard';  // Corrected import
import ConfirmationCard from './ConfirmationCard';


import Spline from '@splinetool/react-spline';
import { X, Edit, Zap, ArrowUp, ArrowDown } from 'react-feather';
import { Button } from './button/Button';
import { Toggle } from './toggle/Toggle';
import { EmailTemplate } from './email-template';
import './ConsolePage.scss';

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



export default function ConsolePage() {
  const LOCAL_RELAY_SERVER_URL: string =
    process.env.NEXT_PUBLIC_LOCAL_RELAY_SERVER_URL || '';

  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ''
    : typeof window !== 'undefined'
    ? localStorage.getItem('tmp::voice_api_key') ||
      prompt('OpenAI API Key') ||
      ''
    : '';

    const handleAllStagesComplete = useCallback(() => {
      const client = clientRef.current;
      client.sendUserMessageContent([
        {
          type: 'input_text',
          text: 'All onboarding stages are now complete.',
        },
      ]);
    }, []);


  
    const [draftNote, setDraftNote] = useState<string | null>(null);
    const [draftEmail, setDraftEmail] = useState<DraftEmail | null>(null);
    const [isEditingDraft, setIsEditingDraft] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);


    const handleEditDraft = useCallback(() => {
      setIsEditingDraft(true);
    }, []);
  
    const handleSaveDraft = useCallback((editedDraft: string) => {
      setDraftNote(editedDraft);
      setIsEditingDraft(false);
    }, []);
  
    const handleSendNote = useCallback(async () => {
      if (draftNote) {
        try {
          const res = await axios.post('/api/addMessageToNotion', {
            messageContent: draftNote,
          });
          setNotesTaken(true);
          setDraftNote(null);

          // Inject message to AI after successful note addition
        const client = clientRef.current;
        client.sendUserMessageContent([
          {
            type: 'input_text',
            text: 'I just added a note to Notion.',
          },
        ]);


          // You might want to add some visual feedback here
        } catch (err: any) {
          console.error('Error in add_notion_message:', err);
          // Handle error (e.g., show an error message to the user)
        }
      }
    }, [draftNote]);

    const handleEditEmail = useCallback(() => {
      setIsEditingEmail(true);
    }, []);
  
    const handleSaveEmail = useCallback((editedEmail: DraftEmail) => {
      setDraftEmail(editedEmail);
      setIsEditingEmail(false);
    }, []);
  
    const handleSendEmail = useCallback(async () => {
      if (draftEmail) {
        try {
          const res = await axios.post('/api/send_email', draftEmail);
          setEmailSent(true);
          setDraftEmail(null);

          // Inject message to AI after successful email send
        const client = clientRef.current;
        client.sendUserMessageContent([
          {
            type: 'input_text',
            text: 'I just clicked send email.',
          },
        ]);
          // You might want to add some visual feedback here
        } catch (err: any) {
          console.error('Error in send_email:', err);
          // Handle error (e.g., show an error message to the user)
        }
      }
    }, [draftEmail]);
  

  useEffect(() => {
    if (apiKey !== '' && typeof window !== 'undefined') {
      localStorage.setItem('tmp::voice_api_key', apiKey);
    }
  }, [apiKey]);

  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<any>(

    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  const [items, setItems] = useState<any[]>([]);

  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});
  const [emailSent, setEmailSent] = useState(false);    // New state variable
  const [notesTaken, setNotesTaken] = useState(false);  // New state variable

  // Removed state declarations for email form
  /*
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [firstName, setFirstName] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  */

  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + '';
      while (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

  const resetAPIKey = useCallback(() => {
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    await wavRecorder.begin();
    await wavStreamPlayer.connect();
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Hello, in this conversation save the first and last name to your memory as 2 seperate values using the memory tool. After I give you the first and last name you are to confirm this memory store by telling me you've indentified the client in my CRM. At some point im going to send an email use rogilbert215@gmail.com.  If I ever say "All onboarding stages are now complete" you need to acknowlegde this fact.If you understand me response only with: hello there let's get started. Dont forget to save the first and last name to your memory`,
      },
    ]);

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setMemoryKv({});
    setEmailSent(false);    // Reset emailSent state
    setNotesTaken(false);   // Reset notesTaken state

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  const startRecording = async () => {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });
    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === 'none');
  };

  // Removed the sendEmail function as the manual email component is no longer needed
  /*
  const sendEmail = async () => {
    // Implementation removed
  };
  */

  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]')
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    client.updateSession({ instructions: instructions });
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });


    
    // Add 'set_memory' tool
    client.addTool(
      {
        name: 'set_memory',
        description: 'Saves important data about the user into memory.',
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The key of the memory value. Always use lowercase and underscores, no other characters.',
            },
            value: {
              type: 'string',
              description: 'Value can be anything represented as a string',
            },
          },
          required: ['key', 'value'],
        },
      },
      async ({ key, value }: { [key: string]: any }) => {
        setMemoryKv((prevMemoryKv) => {
          const newKv = { ...prevMemoryKv };
          if (key === 'tasks') {
            // Parse the tasks string into an array
            newKv[key] = value.split(',').map((task: string) => task.trim());
          } else {
            newKv[key] = value;
          }
          return newKv;
        });
        return { ok: true };
      }
    );
 // Modify the 'send_email' tool
 client.addTool(
  {
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
  async ({ to, subject, firstName }: { [key: string]: any }) => {
    setDraftEmail({ to, subject, firstName });
    return { ok: true, message: 'Draft email created. You can now review and edit it before sending.' };
  }
);

 // Modify the 'add_notion_message' tool
 client.addTool(
  {
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
  async ({ messageContent }: { [key: string]: any }) => {
    setDraftNote(messageContent);
    return { ok: true, message: 'Draft note created. You can now review and edit it before sending.' };
  }
);



    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on('error', (event: any) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      client.reset();
    };
  }, []);
  return (
    <div data-component="ConsolePage">
      <div className="content-top">
     
        <div className="content-api-key">
          {!LOCAL_RELAY_SERVER_URL && (
            <Button
              icon={Edit}
              iconPosition="end"
              buttonStyle="flush"
              label={`api key: ${apiKey.slice(0, 3)}...`}
              onClick={() => resetAPIKey()}
            />
          )}
        </div>
      </div>
  
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <div className="visualization">
              <div className="visualization-entry client">
                <canvas ref={clientCanvasRef} />
              </div>
              <div className="visualization-entry server">
                <canvas ref={serverCanvasRef} />
              </div>
            </div>
         
            <div className="content-main">
              <div className="content-logs">
                <div className="content-block events">
                  <div className="visualization">
                    <div className="visualization-entry client">
                      <canvas ref={clientCanvasRef} />
                    </div>
                    <div className="visualization-entry server">
                      <canvas ref={serverCanvasRef} />
                    </div>
                  </div>
                  <div className="content-block-title">Workspace</div>
                 
                  <div className="content-block-body">
                    {!draftNote && !draftEmail ? (
                      <div className="spline-container">
                        <Spline
                          scene="https://prod.spline.design/tFMrNZoJ2kX1j83X/scene.splinecode"
                        />
                      </div>
                    ) : (
                      <>
                        {draftNote && (
                          <div className="draft-note">
                            <h3>Draft Note:</h3>
                            {isEditingDraft ? (
                              <textarea
                                value={draftNote}
                                onChange={(e) => setDraftNote(e.target.value)}
                                rows={5}
                                className="draft-note-editor"
                              />
                            ) : (
                              <p>{draftNote}</p>
                            )}
                            <div className="draft-note-actions">
                              {isEditingDraft ? (
                                <Button
                                  label="Save Draft"
                                  onClick={() => handleSaveDraft(draftNote)}
                                />
                              ) : (
                                <Button
                                  label="Edit Draft"
                                  onClick={handleEditDraft}
                                />
                              )}
                              <Button
                                label="Send to Notion"
                                onClick={handleSendNote}
                                buttonStyle="action"
                              />
                            </div>
                          </div>
                        )}
                      
                        {draftEmail && (
                          <div className="draft-email">
                            <h3>Draft Email:</h3>
                            {isEditingEmail ? (
                              <div className="draft-email-editor">
                                <input
                                  type="email"
                                  value={draftEmail.to}
                                  onChange={(e) => setDraftEmail({ ...draftEmail, to: e.target.value })}
                                  placeholder="To"
                                  className="draft-email-input"
                                />
                                <input
                                  type="text"
                                  value={draftEmail.subject}
                                  onChange={(e) => setDraftEmail({ ...draftEmail, subject: e.target.value })}
                                  placeholder="Subject"
                                  className="draft-email-input"
                                />
                                <input
                                  type="text"
                                  value={draftEmail.firstName}
                                  onChange={(e) => setDraftEmail({ ...draftEmail, firstName: e.target.value })}
                                  placeholder="First Name"
                                  className="draft-email-input"
                                />
                              </div>
                            ) : (
                              <div>
                                <p><strong>To:</strong> {draftEmail.to}</p>
                                <p><strong>Subject:</strong> {draftEmail.subject}</p>
                                <p><strong>First Name:</strong> {draftEmail.firstName}</p>
                                <div className="email-preview">
                                  <h4>Email Preview:</h4>
                                  <div className="email-content">
                                    <EmailTemplate firstName={draftEmail.firstName} />
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="draft-email-actions">
                              {isEditingEmail ? (
                                <Button
                                  label="Save Draft"
                                  onClick={() => handleSaveEmail(draftEmail)}
                                />
                              ) : (
                                <Button
                                  label="Edit Draft"
                                  onClick={handleEditEmail}
                                />
                              )}
                              <Button
                                label="Send Email"
                                onClick={handleSendEmail}
                                buttonStyle="action"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <div className="content-block conversation">
            <div className="content-block-title">Conversation</div>
            <div className="content-block-body" data-conversation-content>
              {!items.length && `Awaiting connection...`}
              {items.map((conversationItem, i) => {
                if (conversationItem.role === 'assistant') {
                  return (
                    <div className="conversation-item assistant" key={conversationItem.id || i}>
                      <div className="speaker-content">
                        {conversationItem.formatted.transcript ||
                          conversationItem.formatted.text ||
                          '(Truncated)'}
                      </div>
                    </div>
                  );
                }
                return null; // Don't render user messages
              })}
            </div>
          </div>
  
          <div className="content-actions">
            <Toggle
              defaultValue={false}
              labels={['manual', 'vad']}
              values={['none', 'server_vad']}
              onChange={(_, value) => changeTurnEndType(value)}
            />
            <div className="spacer" />
            {isConnected && canPushToTalk && (
              <Button
                label={isRecording ? 'Release to Send' : 'Push to Talk'}
                buttonStyle={isRecording ? 'alert' : 'regular'}
                disabled={!isConnected || !canPushToTalk}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={isConnected ? 'Disconnect' : 'Connect'}
              iconPosition={isConnected ? 'end' : 'start'}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? 'regular' : 'action'}
              onClick={
                isConnected ? disconnectConversation : connectConversation
              }
            />
          </div>
        </div>
  
        <div className="content-right">
          <OnboardingProgressCard 
            emailSent={emailSent} 
            notesTaken={notesTaken} 
            onAllStagesComplete={handleAllStagesComplete}
            memoryKv={memoryKv}
          />
        </div>
      </div>
    </div>
  );}