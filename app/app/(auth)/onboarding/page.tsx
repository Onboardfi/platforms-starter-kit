// app/(auth)/onboarding/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/components/onboarding-form';
import InviteAcceptance from '@/components/invite-acceptance';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';

const OnboardingPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [showInviteAcceptance, setShowInviteAcceptance] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('invite');
    setInviteToken(token);
  
    console.log('OnboardingPage - Session:', session);
    console.log('OnboardingPage - Status:', status);
    console.log('OnboardingPage - Has Invite:', session?.hasInvite);
  
    // If user is not authenticated or has an invalid session
    if (status === 'unauthenticated' || (session?.user?.id === '')) {
      router.push(`/login${token ? `?invite=${token}` : ''}`);
      return;
    }

    // Important: Check both organizationId AND needsOnboarding
    if (session?.organizationId && session?.needsOnboarding === false) {
      router.push('/');
      return;
    }

    if (session?.hasInvite) {
      setShowInviteAcceptance(true);
    }
  }, [session, status, router]);

  // Show loading state while checking session
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-pulse text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-neutral-900 border-neutral-800">
        {showInviteAcceptance ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-6 text-center">
              Welcome to Onboardfi
            </h1>
            <p className="text-neutral-400 text-center mb-8">
              You have been invited to join an organization
            </p>
            <InviteAcceptance />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-6 text-center">
              Create Your Organization
            </h1>
            <OnboardingForm inviteToken={inviteToken} />
          </>
        )}
      </Card>
    </div>
  );
};

export default OnboardingPage;