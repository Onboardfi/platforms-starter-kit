
// components/monday/LeadPreview.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface LeadData {
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}

interface LeadPreviewProps {
  lead: LeadData;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (lead: LeadData) => void;
  onSend: () => Promise<void>;
}

export function LeadPreview({
  lead,
  isEditing,
  onEdit,
  onSave,
  onSend
}: LeadPreviewProps) {
  return (
    <Card className="bg-dark-accent-1 border-dark-accent-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white font-mono">
          Lead Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="First Name"
                value={lead.firstName}
                onChange={(e) => onSave({ ...lead, firstName: e.target.value })}
                className="bg-dark-accent-2 border-dark-accent-3 text-white"
              />
              <Input
                placeholder="Last Name"
                value={lead.lastName}
                onChange={(e) => onSave({ ...lead, lastName: e.target.value })}
                className="bg-dark-accent-2 border-dark-accent-3 text-white"
              />
            </div>
            <Input
              placeholder="Company"
              value={lead.company}
              onChange={(e) => onSave({ ...lead, company: e.target.value })}
              className="bg-dark-accent-2 border-dark-accent-3 text-white"
            />
            <Input
              placeholder="Email"
              type="email"
              value={lead.email}
              onChange={(e) => onSave({ ...lead, email: e.target.value })}
              className="bg-dark-accent-2 border-dark-accent-3 text-white"
            />
            <Input
              placeholder="Phone"
              type="tel"
              value={lead.phone}
              onChange={(e) => onSave({ ...lead, phone: e.target.value })}
              className="bg-dark-accent-2 border-dark-accent-3 text-white"
            />
            <Input
              placeholder="Source"
              value={lead.source}
              onChange={(e) => onSave({ ...lead, source: e.target.value })}
              className="bg-dark-accent-2 border-dark-accent-3 text-white"
            />
            <Textarea
              placeholder="Notes"
              value={lead.notes}
              onChange={(e) => onSave({ ...lead, notes: e.target.value })}
              className="bg-dark-accent-2 border-dark-accent-3 text-white min-h-[100px]"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-dark-accent-2 border border-dark-accent-3 rounded-lg p-4">
              <div className="space-y-2 text-sm font-mono">
                <div className="flex">
                  <span className="text-gray-400 w-24">Name:</span>
                  <span className="text-white">{`${lead.firstName} ${lead.lastName}`}</span>
                </div>
                {lead.company && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Company:</span>
                    <span className="text-white">{lead.company}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Email:</span>
                    <span className="text-white">{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Phone:</span>
                    <span className="text-white">{lead.phone}</span>
                  </div>
                )}
                {lead.source && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Source:</span>
                    <span className="text-white">{lead.source}</span>
                  </div>
                )}
                {lead.notes && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Notes:</span>
                    <span className="text-white whitespace-pre-wrap">{lead.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end space-x-4 mt-4">
          <Button
            variant="outline"
            onClick={isEditing ? () => onSave(lead) : onEdit}
            className="font-mono hover-dream bg-dark-accent-2 border-dark-accent-3"
          >
            {isEditing ? "Save Changes" : "Edit Lead"}
          </Button>
          <Button
            onClick={onSend}
            className="font-mono hover-dream bg-dream-cyan text-black"
          >
            Send to Monday.com
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
