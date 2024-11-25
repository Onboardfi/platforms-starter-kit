// /components/onboarding-form.tsx

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import LoadingDots from "@/components/icons/loading-dots";
import Image from "next/image";

interface OnboardingFormProps {
  inviteToken?: string | null;
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ inviteToken }) => {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [formData, setFormData] = useState({
    organizationName: '',
    companySize: 'small',
    industry: '',
  });

  // Initialize organization name from session data
  useEffect(() => {
    if (session?.user?.name) {
      setFormData(prev => ({
        ...prev,
        organizationName: `${session.user.name}'s Organization`
      }));
    }
  }, [session?.user?.name]);

  // Handle organization redirect
  useEffect(() => {
    if (status === 'authenticated' && session?.organizationId) {
      console.log('Redirecting to dashboard - Organization exists:', session.organizationId);
      router.push('/');
    }
  }, [session, status, router]);

  const waitForSessionUpdate = async (organizationId: string) => {
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 1000; // 1 second between attempts

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Force a session refresh
      await updateSession();
      
      const updatedSession = await fetch('/api/auth/session').then(res => res.json());
      
      if (updatedSession?.organizationId === organizationId) {
        return true;
      }
      
      attempts++;
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading || !formData.organizationName.trim()) {
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating your organization...');

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.organizationName.trim(),
          metadata: {
            companySize: formData.companySize,
            industry: formData.industry.trim(),
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      const organizationId = data.organization?.id;
      if (!organizationId) {
        throw new Error('No organization ID received from server');
      }

      // Update session with new organization data
      await updateSession({
        organizationId,
        needsOnboarding: false
      });

      // Wait for session to be updated
      const sessionUpdated = await waitForSessionUpdate(organizationId);
      if (!sessionUpdated) {
        throw new Error('Session update timeout - please refresh the page');
      }

      // If there's an invite token, process the invite
      if (inviteToken) {
        const acceptResponse = await fetch('/api/organizations/invites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken }),
        });

        if (!acceptResponse.ok) {
          throw new Error('Failed to accept invite token');
        }

        // Optionally, handle the response from accepting the invite
      }

      toast.success('Organization created successfully!', { id: toastId });
      router.push('/');

    } catch (error: any) {
      console.error('Organization creation error:', error);
      toast.error(error.message || 'Failed to create organization', { id: toastId });
      
      if (retryCount >= 2) {
        toast.error(
          'Having trouble creating your organization. Please refresh the page and try again.',
          { duration: 5000 }
        );
      } else {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <LoadingDots color="#A8A29E" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Logo"
            width={48}
            height={48}
            className="mx-auto mb-4 rounded-xl border border-white/10 p-2 bg-white/5"
          />
          <h2 className="text-2xl font-cal text-white mb-2">Name your organization</h2>
          <p className="text-sm text-white/60">
            This will be your workspace for managing onboard flows
          </p>
        </div>

        <form onSubmit={handleSubmit} 
              className="space-y-6 bg-neutral-900/50 backdrop-blur-xl rounded-xl p-6 
                        border border-white/10">
          <div className="space-y-6">
            <div>
              <label htmlFor="organizationName" 
                     className="block text-sm font-medium text-white/80 mb-1">
                Organization Name
              </label>
              <input
                id="organizationName"
                type="text"
                required
                value={formData.organizationName}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  organizationName: e.target.value 
                }))}
                disabled={loading}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 
                         text-white placeholder-white/40 focus:border-white/20 
                         focus:outline-none focus:ring-2 focus:ring-white/10
                         disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your organization name"
              />
            </div>

            <div>
              <label htmlFor="companySize" className="block text-sm font-medium text-white/80 mb-1">
                Company Size
              </label>
              <select
                id="companySize"
                value={formData.companySize}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  companySize: e.target.value 
                }))}
                disabled={loading}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 
                         text-white focus:border-white/20 focus:outline-none 
                         focus:ring-2 focus:ring-white/10
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="small">1-10 employees</option>
                <option value="medium">11-50 employees</option>
                <option value="large">51-200 employees</option>
                <option value="enterprise">201+ employees</option>
              </select>
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-white/80 mb-1">
                Industry
              </label>
              <input
                id="industry"
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  industry: e.target.value 
                }))}
                disabled={loading}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 
                         text-white placeholder-white/40 focus:border-white/20 
                         focus:outline-none focus:ring-2 focus:ring-white/10
                         disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., Technology, Healthcare, etc."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.organizationName.trim()}
            className={`w-full flex justify-center items-center py-3 px-4 rounded-lg 
                       text-sm font-medium text-white transition-all duration-200
                       ${loading || !formData.organizationName.trim() 
                         ? 'bg-white/10 cursor-not-allowed' 
                         : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'}`}
          >
            {loading ? <LoadingDots color="#A8A29E" /> : 'Create Organization'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          By creating an organization, you agree to our{' '}
          <a href="#" className="text-white/60 hover:text-white">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-white/60 hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default OnboardingForm;
