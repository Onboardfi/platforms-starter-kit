"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import Image from 'next/image';
import { Building2, Users2, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createSite } from '@/lib/actions';

interface OnboardingFormProps {
  inviteToken?: string | null;
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ inviteToken }) => {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);

  console.log('Component Rendered: status =', status, 'session =', session);

  // Initialize 'step' from localStorage
  const [step, setStep] = useState<number>(() => {
    let initialStep = 1;
    if (typeof window !== 'undefined') {
      const storedStep = parseInt(localStorage.getItem('onboardingStep') || '1');
      initialStep = storedStep;
      console.log('Initial step from localStorage:', storedStep);
    }
    console.log('useState initial step:', initialStep);
    return initialStep;
  });

  const [formData, setFormData] = useState({
    organizationName: '',
    companySize: 'small',
    industry: '',
    siteCreated: false,
  });

  // Ensure the root domain is available
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

  useEffect(() => {
    // Update localStorage whenever 'step' changes
    if (typeof window !== 'undefined' && step !== null) {
      localStorage.setItem('onboardingStep', step.toString());
      console.log('Updated localStorage onboardingStep to:', step);
    }
  }, [step]);

  useEffect(() => {
    // React to changes in session.organizationId
    if (session?.organizationId) {
      console.log('Session has organizationId after update:', session.organizationId);
      setStep(2);
    } else {
      console.log('Session does not have organizationId yet.');
    }
  }, [session?.organizationId]);

  // Fetch organization details when 'organizationId' is available
// onboarding-form.tsx

useEffect(() => {
  if (session?.organizationId) {
    console.log('Fetching organization details for ID:', session.organizationId);
    const fetchOrgDetails = async () => {
      try {
        const response = await fetch('/api/organizations/current');
        const data = await response.json();
        console.log('Fetched organization details:', data);
        if (data.organization?.name) {
          setFormData(prev => ({
            ...prev,
            organizationName: data.organization.name,
          }));
        }
      } catch (error) {
        console.error('Error fetching organization details:', error);
      }
    };
    fetchOrgDetails();
  }
}, [session?.organizationId]);


  // Ensure consistent hook order by placing all hooks above this line
  useEffect(() => {
    console.log('Current step:', step); // Debug logging
  }, [step]);

  // Conditional return statement must come after all hooks
  if (status === 'loading' || step === null) {
    console.log('Status is loading or step is null. Rendering loader.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <LoadingDots color="#A8A29E" />
      </div>
    );
  }

  const handleSubmitOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || !formData.organizationName.trim()) return;

    setLoading(true);
    const toastId = toast.loading('Creating your organization...');
    console.log('Submitting organization with name:', formData.organizationName);

    try {
      const cleanName = formData.organizationName.trim().toLowerCase();
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          metadata: {
            companySize: formData.companySize,
            industry: formData.industry.trim(),
          },
        }),
      });

      const data = await response.json();
      console.log('Organization creation response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      const organizationId = data.organization?.id;
      if (!organizationId) {
        throw new Error('No organization ID received');
      }

      console.log('Organization created with ID:', organizationId);

      // Store organization name regardless of session state
      setFormData(prev => ({
        ...prev,
        organizationName: cleanName,
      }));

      // Force session refresh
      const updated = await updateSession({});
      console.log('Session updated:', updated);

      toast.success('Organization created successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Organization creation error:', error);
      toast.error(error.message || 'Failed to create organization', { id: toastId });
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
    console.log('Creating site with name:', formData.organizationName);

    try {
      const siteFormData = new FormData();
      const siteName = formData.organizationName.toLowerCase();

      // Ensure the site name equals the organization name
      siteFormData.append('name', formData.organizationName);
      siteFormData.append('subdomain', siteName);
      siteFormData.append('description', `Official site for ${formData.organizationName}`);
      siteFormData.append('font', 'font-cal');
      siteFormData.append('message404', 'This page does not exist.');

      const siteId = await createSite(siteFormData);

      console.log('Site creation result:', siteId);

      if (!siteId) {
        throw new Error('Failed to create site');
      }

      await updateSession({
        needsOnboarding: false,
      });

      setFormData(prev => ({
        ...prev,
        siteCreated: true,
      }));

      // Clear 'onboardingStep' from localStorage after completion
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboardingStep');
        console.log('Removed onboardingStep from localStorage');
      }

      toast.success('Setup completed successfully!', { id: toastId });

      // Redirect to the home page
      console.log('Redirecting to home page');
      router.push('/');
    } catch (error: any) {
      console.error('Site creation error:', error);
      toast.error(error.message || 'Failed to create site', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {step > 1 && (
                <button
                  onClick={() => {
                    console.log('Back button clicked. Setting step to 1');
                    setStep(1);
                  }}
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
            {step === 1 ? 'Name your organization' : 'Create your site'}
          </h2>
          <p className="text-sm text-white/60">
            {step === 1
              ? 'Choose a simple, one-word name for your organization'
              : 'Review and confirm your site details'}
          </p>
        </div>

        <div className="relative group p-8 rounded-xl border border-white/[0.02] bg-neutral-900/50 backdrop-blur-md">
          <div
            className="absolute inset-0 bg-gradient-to-br from-custom-green/5 via-custom-green-light/5 to-custom-green-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"
            style={{ filter: 'blur(40px)' }}
          />
          {step === 1 ? (
            <form onSubmit={handleSubmitOrganization} className="relative space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-custom-green" />
                    <label
                      htmlFor="organizationName"
                      className="block text-sm font-medium text-white/80"
                    >
                      Organization Name
                    </label>
                  </div>
                  <input
                    id="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={e => {
                      const value = e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase();
                      console.log('Organization name changed to:', value);
                      setFormData(prev => ({ ...prev, organizationName: value }));
                    }}
                    disabled={loading}
                    className="w-full rounded-lg bg-white/[0.02] border border-white/[0.02] px-4 py-2 
                             text-white placeholder-white/40 focus:border-white/20 
                             focus:outline-none focus:ring-2 focus:ring-white/10
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="myorganization"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    This will be used as your site name and subdomain
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Users2 className="w-5 h-5 text-custom-green" />
                      <label
                        htmlFor="companySize"
                        className="block text-sm font-medium text-white/80"
                      >
                        Company Size
                      </label>
                    </div>
                    <select
                      id="companySize"
                      value={formData.companySize}
                      onChange={e => {
                        console.log('Company size changed to:', e.target.value);
                        setFormData(prev => ({ ...prev, companySize: e.target.value }));
                      }}
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
                      <label
                        htmlFor="industry"
                        className="block text-sm font-medium text-white/80"
                      >
                        Industry
                      </label>
                    </div>
                    <input
                      id="industry"
                      type="text"
                      value={formData.industry}
                      onChange={e => {
                        console.log('Industry changed to:', e.target.value);
                        setFormData(prev => ({ ...prev, industry: e.target.value }));
                      }}
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
                             ${
                               loading || !formData.organizationName.trim()
                                 ? 'bg-white/[0.02] cursor-not-allowed'
                                 : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-white/20'
                             }`}
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
                    <h3 className="text-lg font-medium text-white mb-1">Site Configuration</h3>
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
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-3 px-4 rounded-lg 
                             text-sm font-medium text-white transition-all duration-200
                             ${
                               loading
                                 ? 'bg-white/[0.02] cursor-not-allowed'
                                 : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-white/20'
                             }`}
              >
                {loading ? <LoadingDots color="#A8A29E" /> : 'Create Site'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          By continuing, you agree to our{' '}
          <a href="#" className="text-white/60 hover:text-white">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="text-white/60 hover:text-white">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default OnboardingForm;
