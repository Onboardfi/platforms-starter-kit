"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import LoadingDots from "@/components/icons/loading-dots";
import Image from "next/image";
import { Building2, Users2, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createSite } from '@/lib/actions';
import va from "@vercel/analytics";

interface OnboardingFormProps {
  inviteToken?: string | null;
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ inviteToken }) => {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    organizationName: '',
    companySize: 'small',
    industry: '',
  });

  // Ensure the root domain is available
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com';
  useEffect(() => {
    // Whenever organization is created and session updates
    if (session?.organizationId) {
      // Fetch organization details to get the correct name
      const fetchOrgDetails = async () => {
        try {
          const response = await fetch('/api/organizations/current');
          const data = await response.json();
          if (data.organization?.name) {
            setFormData(prev => ({
              ...prev,
              organizationName: data.organization.name
            }));
          }
        } catch (error) {
          console.error('Error fetching organization details:', error);
        }
      };
      fetchOrgDetails();
    }
  }, [session?.organizationId]);

  const waitForSessionUpdate = async (organizationId: string) => {
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 1000;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      await updateSession();
      const updatedSession = await fetch('/api/auth/session').then(res => res.json());

      if (updatedSession?.organizationId === organizationId) {
        return true;
      }
      attempts++;
    }
    return false;
  };

  const handleSubmitOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (loading || !formData.organizationName.trim()) {
      return;
    }
  
    // Check if user already has an organization
    if (session?.organizationId) {
      setStep(2);
      return;
    }
  
    // Validate organization name
    const cleanName = formData.organizationName.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(cleanName)) {
      toast.error('Organization name can only contain lowercase letters, numbers, and hyphens');
      return;
    }
  
    setLoading(true);
    const toastId = toast.loading('Creating your organization...');
  
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName, // Use the cleaned form data name
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
  
      await updateSession({
        organizationId,
        needsOnboarding: true
      });
  
      const sessionUpdated = await waitForSessionUpdate(organizationId);
      if (!sessionUpdated) {
        throw new Error('Session update timeout - please refresh the page');
      }
  
      if (inviteToken) {
        const acceptResponse = await fetch('/api/organizations/invites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken }),
        });
  
        if (!acceptResponse.ok) {
          throw new Error('Failed to accept invite token');
        }
      }
  
      va.track("Created Organization");
      toast.success('Organization created successfully!', { id: toastId });
  
      // Update the form data to ensure the organization name persists
    
    // Ensure form data matches what we just created
    setFormData(prev => ({
      ...prev,
      organizationName: cleanName
    }));

  
      // Move to step 2
      setStep(2);
  
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

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.organizationName) {
      toast.error('Organization name is required');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Creating your site...');
  
    try {
      const siteFormData = new FormData();
      // Use the current form data organization name, not the session data
      const siteName = formData.organizationName.toLowerCase();
      
      console.log('Creating site with name:', siteName); // Add logging
      
      siteFormData.append('name', siteName);
      siteFormData.append('subdomain', siteName);
      siteFormData.append('description', `Official site for ${siteName}`);
      siteFormData.append('font', 'font-cal');
      siteFormData.append('message404', 'This page does not exist.');
  
      const siteId = await createSite(siteFormData);
      
      if (!siteId) {
        throw new Error('Failed to create site');
      }
  
      // Update session and wait for the change to be reflected
      await updateSession({
        needsOnboarding: false
      });
  
      // Wait for session update to propagate
      for (let i = 0; i < 5; i++) {
        const session = await fetch('/api/auth/session').then(res => res.json());
        if (!session.needsOnboarding) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
  
      va.track("Created Site");
      toast.success('Setup completed successfully!', { id: toastId });
      
      // Add logging before redirect
      console.log('Site created successfully:', {
        name: siteName,
        siteId
      });
      
      // Force a full page reload to ensure middleware sees the new state
      window.location.href = '/';
    } catch (error: any) {
      console.error('Site creation error:', error);
      toast.error(error.message || 'Failed to create site', { id: toastId });
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
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {step > 1 && (
                <button
                  onClick={() => setStep(1)}
                  className="mr-4 text-white/60 hover:text-white flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
              )}
              <span className="text-sm text-white/60">Step {step} of 2</span>
            </div>
            <span className="text-sm font-medium text-white/60">
              {step === 1 ? '50%' : '100%'}
            </span>
          </div>
          <div className="h-2 bg-white/[0.02] rounded-full overflow-hidden">
            <div
              className="h-full bg-custom-green transition-all duration-500"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Logo"
            width={48}
            height={48}
            className="mx-auto mb-4 rounded-xl border border-white/10 p-2 bg-white/5"
          />
          <h2 className="text-2xl font-cal text-white mb-2">
            {step === 1 ? "Name your organization" : "Complete setup"}
          </h2>
          <p className="text-sm text-white/60">
            {step === 1
              ? "Choose a simple, one-word name for your organization"
              : `Create your first site at ${formData.organizationName.toLowerCase()}.${ROOT_DOMAIN}`}
          </p>
        </div>

        <div className="relative group p-8 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md shine shadow-dream">
          <div className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" style={{ filter: "blur(40px)" }} />

          {step === 1 ? (
            <form onSubmit={handleSubmitOrganization} className="relative space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-custom-green" />
                    <label htmlFor="organizationName" className="block text-sm font-medium text-white/80">
                      Organization Name
                    </label>
                  </div>
                  <input
                    id="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase();
                      setFormData(prev => ({ ...prev, organizationName: value }));
                    }}
                    disabled={loading}
                    className="w-full rounded-lg bg-white/[0.02] border border-white/[0.02] px-4 py-2 
                             text-white placeholder-white/40 focus:border-white/20 
                             focus:outline-none focus:ring-2 focus:ring-white/10
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="myorganization"
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens allowed"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    This will also be used as your site name and subdomain
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Users2 className="w-5 h-5 text-custom-green" />
                      <label htmlFor="companySize" className="block text-sm font-medium text-white/80">
                        Company Size
                      </label>
                    </div>
                    <select
                      id="companySize"
                      value={formData.companySize}
                      onChange={(e) => setFormData(prev => ({ ...prev, companySize: e.target.value }))}
                      disabled={loading}
                      className="w-full rounded-lg bg-white/[0.02] border border-white/[0.02] px-4 py-2 
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
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-5 h-5 text-custom-green" />
                      <label htmlFor="industry" className="block text-sm font-medium text-white/80">
                        Industry
                      </label>
                    </div>
                    <input
                      id="industry"
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      disabled={loading}
                      className="w-full rounded-lg bg-white/[0.02] border border-white/[0.02] px-4 py-2 
                               text-white placeholder-white/40 focus:border-white/20 
                               focus:outline-none focus:ring-2 focus:ring-white/10
                               disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g., Technology, Healthcare, etc."
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.organizationName.trim()}
                className={`w-full flex justify-center items-center py-3 px-4 rounded-lg 
                           text-sm font-medium text-white transition-all duration-200
                           ${loading || !formData.organizationName.trim() 
                             ? 'bg-white/[0.02] cursor-not-allowed' 
                             : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-white/20'}`}
              >
                {loading ? <LoadingDots color="#A8A29E" /> : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateSite} className="relative space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-6 rounded-lg bg-white/[0.02] border border-white/[0.02]">
                  <CheckCircle2 className="w-8 h-8 text-custom-green flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">Your site details</h3>
                    <div className="space-y-2 text-sm text-white/60">
                      <p>
                        <span className="text-white/40">Name:</span>{' '}
                        <span className="text-white">{formData.organizationName}</span>
                      </p>
                      <p>
                        <span className="text-white/40">URL:</span>{' '}
                        <span className="text-white">
                          {formData.organizationName.toLowerCase()}.{ROOT_DOMAIN}
                        </span>
                      </p>
                      <p>
                        <span className="text-white/40">Description:</span>{' '}
                        <span className="text-white/80">
                          Official site for {formData.organizationName}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-white/60 text-center px-6">
                  <p>
                    Want to change the organization name?{' '}
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-custom-green hover:text-custom-green/80 transition-colors"
                    >
                      Go back
                    </button>
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-3 px-4 rounded-lg 
                           text-sm font-medium text-white transition-all duration-200
                           ${loading 
                             ? 'bg-white/[0.02] cursor-not-allowed' 
                             : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-white/20'}`}
              >
                {loading ? <LoadingDots color="#A8A29E" /> : 'Complete Setup'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          By creating an {step === 1 ? 'organization' : 'site'}, you agree to our{' '}
          <a href="#" className="text-white/60 hover:text-white">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-white/60 hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default OnboardingForm;
