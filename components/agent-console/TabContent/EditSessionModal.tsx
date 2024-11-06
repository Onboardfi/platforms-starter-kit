// components/agent-console/TabContent/EditSessionModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "../shared/LoadingState";
import { Session } from '@/lib/types';

interface EditSessionModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  isSaving: boolean;
}

export function EditSessionModal({
  session,
  isOpen,
  onClose,
  onSave,
  isSaving
}: EditSessionModalProps) {
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    if (session) {
      setName(session.name);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onSave(name.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border border-gray-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Session Name</DialogTitle>
          <DialogDescription className="text-gray-400">
            Change the name of this onboarding session.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-400">
                Session Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter session name"
                className="bg-gray-900 border-gray-800 text-white"
                disabled={isSaving}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-gray-800 text-gray-400 hover:bg-gray-800"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving ? <LoadingState /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}