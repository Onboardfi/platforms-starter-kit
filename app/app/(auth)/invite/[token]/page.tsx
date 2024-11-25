// app/(auth)/invite/[token]/page.tsx

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { acceptInvite } from '@/lib/actions/accept-invite'; // Ensure this is the only acceptInvite
import { Suspense } from 'react';

interface Props {
  params: { token: string }
}

async function InvitePage({ params }: Props) {
  const { token } = params;
  const session = await getSession();

  // 1. Redirect unauthenticated users to login
  if (!session?.user) {
    redirect(`/login?invite=${token}`);
  }

  try {
    // 2. Process the invite
    const result = await acceptInvite(token);

    // 3. Handle different scenarios
    if (!result.success) {
      if (result.requiresSignup) {
        // User needs to sign up with correct email
        redirect(`/signup?invite=${token}&email=${encodeURIComponent(result.inviteEmail!)}`);
      }

      // Handle general errors
      redirect(`/invite-error?error=${encodeURIComponent(result.error || 'Unknown error')}`);
    }

    // 4. Successful acceptance - redirect to dashboard
    redirect('/app/dashboard');
    
  } catch (error) {
    console.error('Error processing invite:', error);
    redirect('/invite-error');
  }

  // This return is never reached due to redirects
  return null;
}

// Add loading UI
export default function InvitePageWrapper(props: Props) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        {/* Add a loading spinner or message here */}
        <p>Processing your invite...</p>
      </div>
    }>
      <InvitePage {...props} />
    </Suspense>
  );
}
