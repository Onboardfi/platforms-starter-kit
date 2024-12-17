import { useCallback, useRef, useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailTemplate } from "@/components/email-template";
import Spline from '@splinetool/react-spline';
import { DraftEmail, DraftLead } from "../utils/types";

interface WorkspaceTabProps {
  draftNote: string | null;
  draftEmail: DraftEmail | null;
  isEditingDraft: boolean;
  isEditingEmail: boolean;
  handleEditDraft: () => void;
  handleEditEmail: () => void;
  handleSaveDraft: (draft: string) => void;
  handleSaveEmail: (email: DraftEmail) => void;
  handleSendNote: () => Promise<void>;
  handleSendEmail: () => Promise<void>;
  setDraftNote: (note: string | null) => void;
  setDraftEmail: (email: DraftEmail | null) => void;
  currentSessionId: string | null;
  isRecording: boolean;
  isListening: boolean;
  draftLead: DraftLead | null;
  isEditingLead: boolean;
  handleEditLead: () => void;
  handleSaveLead: (lead: DraftLead) => void;
  handleSendLead: () => Promise<void>;
  setDraftLead: (lead: DraftLead | null) => void;
  agentId: string;
  agentSite: {
    id: string;
    organizationId: string;
  };
}

export default function WorkspaceTab({
  draftNote,
  draftEmail,
  isEditingDraft,
  isEditingEmail,
  handleEditDraft,
  handleEditEmail,
  handleSaveDraft,
  handleSaveEmail,
  handleSendNote,
  handleSendEmail,
  setDraftNote,
  setDraftEmail,
  currentSessionId,
  isRecording,
  isListening,
  draftLead,
  isEditingLead,
  handleEditLead,
  handleSaveLead,
  handleSendLead,
  setDraftLead,
  agentId,
  agentSite
}: WorkspaceTabProps) {
  const splineRef = useRef<any>(null);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const animationFrameRef = useRef<number>();

  // Monitor WebSocket responses for audio playback
 // Monitor WebSocket responses for audio playback
useEffect(() => {
  const handleWebSocketMessage = (event: CustomEvent) => {
    const data = event.detail;
    
    // Check if we're receiving audio data from the assistant
    if (data && data.type === 'response.audio.delta' && data.delta) {
      // Set speaking state based on actual audio data presence
      const audioData = data.delta;
      if (audioData && audioData.length > 0) {
        setIsAssistantSpeaking(true);
        
        // Reset the speaking state after a short delay if no new audio data arrives
        setTimeout(() => {
          setIsAssistantSpeaking(false);
        }, 100); // Short delay to create natural pulsing with the audio stream
      }
    }
  };

  // Listen for custom WebSocket events from our WebSocket handler
  window.addEventListener('websocket-message', handleWebSocketMessage as EventListener);
  return () => window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener);
}, []);

  const handleSplineLoad = useCallback((splineApp: any) => {
    console.log('Spline scene loaded');
    splineRef.current = splineApp;
    
    const sphere = splineApp.findObjectByName('eyes');
    if (sphere) {
      sphere.initialScale = { ...sphere.scale };
      sphere.initialRotation = { ...sphere.rotation };
    }
  }, []);

  // Spline animation logic
  useEffect(() => {
    if (!splineRef.current) return;

    const sphere = splineRef.current.findObjectByName('eyes');
    if (!sphere) return;

    const animate = () => {
      if (isAssistantSpeaking) {
        // Talking animation - energetic pulsing and rotation
        const time = Date.now() * 0.003;
        const pulseScale = Math.sin(time * 2) * 0.15 + 1;
        
        sphere.scale.x = sphere.initialScale.x * pulseScale;
        sphere.scale.y = sphere.initialScale.y * pulseScale;
        sphere.scale.z = sphere.initialScale.z * pulseScale;
        
        sphere.rotation.y += 0.03;
        sphere.rotation.x = Math.sin(time) * 0.2;
      } else if (isRecording) {
        // Recording animation - steady pulse
        const pulseScale = Math.sin(Date.now() * 0.005) * 0.1 + 1;
        
        sphere.scale.x = sphere.initialScale.x * pulseScale;
        sphere.scale.y = sphere.initialScale.y * pulseScale;
        sphere.scale.z = sphere.initialScale.z * pulseScale;
      } else if (isListening) {
        // Listening animation - gentle sway
        const time = Date.now() * 0.002;
        sphere.rotation.y = Math.sin(time) * 0.3;
        
        const pulseScale = Math.sin(time) * 0.05 + 1;
        sphere.scale.x = sphere.initialScale.x * pulseScale;
        sphere.scale.y = sphere.initialScale.y * pulseScale;
        sphere.scale.z = sphere.initialScale.z * pulseScale;
      } else {
        // Idle animation - subtle movement
        const time = Date.now() * 0.001;
        const pulseScale = Math.sin(time) * 0.03 + 1;
        
        sphere.scale.x = sphere.initialScale.x * pulseScale;
        sphere.scale.y = sphere.initialScale.y * pulseScale;
        sphere.scale.z = sphere.initialScale.z * pulseScale;
        
        sphere.rotation.y *= 0.95;
        sphere.rotation.x *= 0.95;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAssistantSpeaking, isRecording, isListening]);

  if (!currentSessionId) {
    return (
      <div className="p-6 mt-2">
        <Card className="bg-black border border-gray-800">
          <CardContent className="flex items-center justify-center h-[620px]">
            <p className="text-gray-400 font-mono text-sm">
              No active session selected
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 mt-2">
      <Card className="bg-black border border-gray-800">
        <CardContent className="p-6">
          <div className="mb-4">
            <Badge variant="outline" className="text-xs text-white">
              Session: {currentSessionId}
            </Badge>
          </div>
          
          {!draftNote && !draftEmail && !draftLead ? (
            <div className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
              <div className="relative h-[620px] rounded-lg overflow-hidden bg-black">

            
                <Spline
                  scene="https://prod.spline.design/FJBFDWXZSeOxMYBV/scene.splinecode"
                  onLoad={handleSplineLoad}
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-sm text-white font-mono">
                      {isRecording ? 'Recording' : 'Ready'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        isAssistantSpeaking ? 'bg-blue-500 animate-pulse' : 
                        isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-sm text-white font-mono">
                      {isAssistantSpeaking ? 'Assistant Speaking' :
                       isListening ? 'AI Listening' : 'Idle'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Note Section */}
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

              {/* Email Section */}
              {draftEmail && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white font-mono">Draft Email</h3>
                  {isEditingEmail ? (
                    <div className="space-y-4">
                      <Input
                        type="email"
                        value={draftEmail.to}
                        onChange={(e) => setDraftEmail({ ...draftEmail, to: e.target.value })}
                        placeholder="Recipient Email"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <Input
                        type="text"
                        value={draftEmail.subject}
                        onChange={(e) => setDraftEmail({ ...draftEmail, subject: e.target.value })}
                        placeholder="Subject"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <Input
                        type="text"
                        value={draftEmail.firstName}
                        onChange={(e) => setDraftEmail({ ...draftEmail, firstName: e.target.value })}
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

              {/* Lead Section */}
              {draftLead && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white font-mono">Draft Lead</h3>
                  <div className="bg-dark-accent-1 border border-gray-800 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* First Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-mono text-gray-400">First Name</label>
                        <Input
                          type="text"
                          value={draftLead.firstName}
                          onChange={(e) => setDraftLead({ ...draftLead, firstName: e.target.value })}
                          disabled={!isEditingLead}
                          className="bg-black border-gray-800 text-white font-mono"
                        />
                      </div>

                      {/* Last Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-mono text-gray-400">Last Name</label>
                        <Input
                          type="text"
                          value={draftLead.lastName}
                          onChange={(e) => setDraftLead({ ...draftLead, lastName: e.target.value })}
                          disabled={!isEditingLead}
                          className="bg-black border-gray-800 text-white font-mono"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <label className="text-sm font-mono text-gray-400">Email</label>
                        <Input
                          type="email"
                          value={draftLead.email}
                          onChange={(e) => setDraftLead({ ...draftLead, email: e.target.value })}
                          disabled={!isEditingLead}
                          className="bg-black border-gray-800 text-white font-mono"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-2">
                        <label className="text-sm font-mono text-gray-400">Phone</label>
                        <Input
                          type="tel"
                          value={draftLead.phone}
                          onChange={(e) => setDraftLead({ ...draftLead, phone: e.target.value })}
                          disabled={!isEditingLead}
                          className="bg-black border-gray-800 text-white font-mono"
                        />
                      </div>

                      {/* Company */}
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-mono text-gray-400">Company</label>
                        <Input
                          type="text"
                          value={draftLead.company}
                          onChange={(e) => setDraftLead({ ...draftLead, company: e.target.value })}
                          disabled={!isEditingLead}
                          className="bg-black border-gray-800 text-white font-mono"
                        />
                      </div>

                      {/* Source */}
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-mono text-gray-400">Source</label>
                        <Input
                          type="text"
                          value={draftLead.source}
                          onChange={(e) => setDraftLead({ ...draftLead, source: e.target.value })}
                          disabled={!isEditingLead}
                          className="bg-black border-gray-800 text-white font-mono"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-mono text-gray-400">Notes</label>
                        <textarea
                          value={draftLead.notes}
                          onChange={(e) => setDraftLead({ ...draftLead, notes: e.target.value })}
                          disabled={!isEditingLead}
                          className="w-full min-h-[100px] bg-black border border-gray-800 rounded-lg p-2 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4">
                    {isEditingLead ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleSaveLead(draftLead)}
                          className="font-mono"
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDraftLead(null)}
                          className="font-mono text-red-500 hover:text-red-400"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleEditLead}
                          className="font-mono"
                        >
                          Edit Lead
                        </Button>
                        <Button
                          onClick={handleSendLead}
                          className="font-mono bg-blue-600 hover:bg-blue-500"
                        >
                          Create Lead in Monday.com
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}