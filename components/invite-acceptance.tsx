// components/invite-acceptance.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface PendingInvite {
  organizationId: string;
  organizationName: string;
  inviterName: string;
  role: string;
  token: string;
}

export default function InviteAcceptance() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPendingInvites() {
      try {
        const response = await fetch('/api/invites/pending');
        if (!response.ok) throw new Error('Failed to fetch invites');
        const data = await response.json();
        setPendingInvites(data.invites);
      } catch (error) {
        console.error('Error fetching invites:', error);
        toast({
          title: "Error",
          description: "Failed to load invites",
          variant: "destructive"
        });
      }
    }
    fetchPendingInvites();
  }, [toast]);

  const handleAcceptInvite = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      // Update the session with new organization context
      await update({
        organizationId: data.organizationId,
        needsOnboarding: false,
      });

      toast({
        title: "Success",
        description: "Invite accepted successfully",
      });

      // Redirect to dashboard
      window.location.href = '/app/dashboard';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (pendingInvites.length === 0) {
    return (
      <div className="text-center text-neutral-400">
        No pending invites found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingInvites.map((invite) => (
        <Card key={invite.token} className="bg-card">
          <CardHeader>
            <h2 className="text-xl font-semibold">{invite.organizationName}</h2>
            <p className="text-sm text-muted-foreground">
              Invited by {invite.inviterName}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-400">Role: {invite.role}</p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => handleAcceptInvite(invite.token)}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}