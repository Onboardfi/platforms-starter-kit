// /Users/bobbygilbert/Documents/GitHub/platforms-starter-kit/components/agent-console/TabContent/WorkspaceTab.tsx
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
}: WorkspaceTabProps) {
  const handleSplineLoad = (splineApp: any) => {
    console.log('Spline scene loaded');
  };

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
                  scene="https://prod.spline.design/iXkcy912rFIkpvXP/scene.splinecode"
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
                        isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-sm text-white font-mono">
                      {isListening ? 'AI Listening' : 'Idle'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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

              {draftLead && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white font-mono">Draft Lead</h3>
                  {isEditingLead ? (
                    <div className="space-y-4">
                      <Input
                        type="text"
                        value={draftLead.firstName}
                        onChange={(e) => setDraftLead({ ...draftLead, firstName: e.target.value })}
                        placeholder="First Name"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <Input
                        type="text"
                        value={draftLead.lastName}
                        onChange={(e) => setDraftLead({ ...draftLead, lastName: e.target.value })}
                        placeholder="Last Name"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <Input
                        type="text"
                        value={draftLead.company || ''}
                        onChange={(e) => setDraftLead({ ...draftLead, company: e.target.value })}
                        placeholder="Company"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <Input
                        type="email"
                        value={draftLead.email || ''}
                        onChange={(e) => setDraftLead({ ...draftLead, email: e.target.value })}
                        placeholder="Email"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <Input
                        type="tel"
                        value={draftLead.phone || ''}
                        onChange={(e) => setDraftLead({ ...draftLead, phone: e.target.value })}
                        placeholder="Phone"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <Input
                        type="text"
                        value={draftLead.source || ''}
                        onChange={(e) => setDraftLead({ ...draftLead, source: e.target.value })}
                        placeholder="Source"
                        className="bg-dark-accent-1 border-gray-800 text-white font-mono"
                      />
                      <textarea
                        value={draftLead.notes || ''}
                        onChange={(e) => setDraftLead({ ...draftLead, notes: e.target.value })}
                        placeholder="Notes"
                        className="w-full min-h-[100px] bg-dark-accent-1 border border-gray-800 rounded-lg p-4 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white"
                      />
                    </div>
                  ) : (
                    <div className="bg-dark-accent-1 border border-gray-800 rounded-lg p-4">
                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex">
                          <span className="text-gray-400 w-32">Name:</span>
                          <span className="text-white">{draftLead.firstName} {draftLead.lastName}</span>
                        </div>
                        {draftLead.company && (
                          <div className="flex">
                            <span className="text-gray-400 w-32">Company:</span>
                            <span className="text-white">{draftLead.company}</span>
                          </div>
                        )}
                        {draftLead.email && (
                          <div className="flex">
                            <span className="text-gray-400 w-32">Email:</span>
                            <span className="text-white">{draftLead.email}</span>
                          </div>
                        )}
                        {draftLead.phone && (
                          <div className="flex">
                            <span className="text-gray-400 w-32">Phone:</span>
                            <span className="text-white">{draftLead.phone}</span>
                          </div>
                        )}
                        {draftLead.source && (
                          <div className="flex">
                            <span className="text-gray-400 w-32">Source:</span>
                            <span className="text-white">{draftLead.source}</span>
                          </div>
                        )}
                        {draftLead.notes && (
                          <div className="flex">
                            <span className="text-gray-400 w-32">Notes:</span>
                            <span className="text-white whitespace-pre-wrap">{draftLead.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="outline"
                      onClick={isEditingLead ? () => handleSaveLead(draftLead) : handleEditLead}
                      className="font-mono"
                    >
                      {isEditingLead ? "Save Changes" : "Edit Lead"}
                    </Button>
                    <Button
                      onClick={handleSendLead}
                      className="font-mono"
                    >
                      Create Lead
                    </Button>
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
