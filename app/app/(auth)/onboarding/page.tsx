// app/app/(auth)/onboarding/page.tsx
"use client"
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/components/onboarding-form';
import { useSession } from 'next-auth/react';

const OnboardingPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('OnboardingPage - Session:', session);
    console.log('OnboardingPage - Status:', status);
    
    // If user is not authenticated, redirect to login
    if (status === 'unauthenticated') {
      console.log('OnboardingPage - User is unauthenticated. Redirecting to /login.');
      router.push('/login');
      return;
    }
    
    // If user already has an organization, redirect to dashboard
    if (session?.organizationId) {
      console.log('OnboardingPage - User has organizationId. Redirecting to /app/dashboard.');
      router.push('/app/dashboard'); // Ensure this path matches your routing
      return;
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

  return <OnboardingForm />;
};

export default OnboardingPage;
