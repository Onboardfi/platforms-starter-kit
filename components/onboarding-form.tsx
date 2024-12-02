"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import Image from 'next/image';
import { Building2, Users2, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createSite, CreateSiteResponse } from '@/lib/actions';
import { identifyUserWithIntercom } from '@/lib/analytics/intercom';
import { analyticsClient, type UserTraits, type OrganizationTraits } from '@/lib/analytics';

// Define the component's props interface
interface OnboardingFormProps {
  inviteToken?: string | null;
}

// Helper function to clean user data and ensure it matches our UserTraits type
function cleanUserData(session: any): UserTraits {
  return {
    email: session.user.email || undefined,
    name: session.user.name || undefined,
    ghUsername: session.user.username || undefined,
    image: session.user.image || undefined,
  };
}

// Helper function to clean organization data and ensure it matches our OrganizationTraits type
function cleanOrganizationData(data: {
  name: string;
  companySize: string;
  industry: string;
}): OrganizationTraits {
  return {
    name: data.name.trim(),
    companySize: data.companySize,
    industry: data.industry.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ inviteToken }) => {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);

  // Initialize step state from localStorage, defaulting to 1 if not found
  const [step, setStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    return parseInt(localStorage.getItem('onboardingStep') || '1', 10);
  });

  // Form data state with proper typing
  const [formData, setFormData] = useState({
    organizationName: '',
    companySize: 'small',
    industry: '',
    siteCreated: false,
  });

  // Environment configuration
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

  // Effect to keep localStorage in sync with step changes
  useEffect(() => {
    if (typeof window !== 'undefined' && step !== null) {
      localStorage.setItem('onboardingStep', step.toString());
    }
  }, [step]);

  // Effect to update step when organization ID is available
  useEffect(() => {
    if (session?.organizationId) {
      setStep(2);
    }
  }, [session?.organizationId]);

  // Effect to fetch organization details when available
  useEffect(() => {
    if (session?.organizationId) {
      const fetchOrgDetails = async () => {
        try {
          const response = await fetch('/api/organizations/current');
          const data = await response.json();
          
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

  // Handler for organization creation form submission
  const handleSubmitOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !formData.organizationName.trim()) return;

    setLoading(true);
    const toastId = toast.loading('Creating your organization...');

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
      if (!response.ok) throw new Error(data.error || 'Failed to create organization');

      const organizationId = data.organization?.id;
      if (!organizationId) throw new Error('No organization ID received');

      // Handle analytics and Intercom integration when user is available
      if (session?.user?.id) {
        const userData = cleanUserData(session);
        const orgData = cleanOrganizationData({
          name: cleanName,
          companySize: formData.companySize,
          industry: formData.industry,
        });

        // Use our enhanced analytics with Intercom integration
        identifyUserWithIntercom(
          session.user.id,
          {
            ...userData,
            organizationId,
            organizationName: orgData.name,
            companySize: orgData.companySize,
            industry: orgData.industry,
            role: 'owner',
            onboardingStep: 'organization_created',
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          organizationId,
          {
            name: orgData.name,
            companySize: orgData.companySize,
            industry: orgData.industry,
            createdAt: new Date().toISOString(),
            memberCount: 1,
            creator: {
              id: session.user.id,
              ...(userData.name && { name: userData.name }),
              ...(userData.email && { email: userData.email }),
            },
          }
        );
      }

      setFormData(prev => ({
        ...prev,
        organizationName: cleanName,
      }));

      await updateSession({});
      toast.success('Organization created successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Organization creation error:', error);
      toast.error(error.message || 'Failed to create organization', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

// First, let's modify our analytics helpers to properly handle Intercom integration
const handleCreateSite = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.organizationName) {
    toast.error('Organization name is required');
    return;
  }

  setLoading(true);
  const toastId = toast.loading('Creating your site...');

  try {
    // [Previous site form data preparation remains the same]
    const siteFormData = new FormData();
    const siteName = formData.organizationName.toLowerCase();
    siteFormData.append('name', formData.organizationName);
    siteFormData.append('subdomain', siteName);
    siteFormData.append('description', `Official site for ${formData.organizationName}`);
    siteFormData.append('font', 'font-cal');
    siteFormData.append('message404', 'This page does not exist.');

    const siteResponse = await createSite(siteFormData);
    if (!siteResponse) throw new Error('Failed to create site - no response received');

    const siteId = typeof siteResponse === 'string' 
      ? siteResponse 
      : ('id' in siteResponse ? siteResponse.id : null);

    if (!siteId) throw new Error('Failed to get valid site ID from response');

    await updateSession({
      needsOnboarding: false,
    });

    // Handle analytics with proper Intercom integration
    if (session?.user?.id) {
      const INTERCOM_SECRET_KEY = process.env.NEXT_PUBLIC_INTERCOM_IDENTITY_VERIFICATION_SECRET;
      
      if (!INTERCOM_SECRET_KEY) {
        console.warn('Intercom secret key is not configured');
      } else {
        try {
          // Create user traits
          const userTraits: UserTraits = {
            email: session.user.email || undefined,
            name: session.user.name || undefined,
            image: session.user.image || undefined,
            organizationId: session.organizationId || undefined,
            organizationName: formData.organizationName,
            companySize: formData.companySize,
            industry: formData.industry,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString(),
            siteId: siteId.toString(),
            role: 'owner',
            lastLogin: new Date().toISOString(),
          };

          // Create organization traits
          const orgTraits: OrganizationTraits = {
            name: formData.organizationName,
            companySize: formData.companySize,
            industry: formData.industry,
            createdAt: new Date().toISOString(),
            memberCount: 1
          };

          // Use enhanced analytics client with proper Intercom hash
          identifyUserWithIntercom(
            session.user.id,
            userTraits,
            session.organizationId || undefined,
            session.organizationId ? orgTraits : undefined
          );

          // Track the completion event separately
          analyticsClient.track('Onboarding Completed', {
            siteId: siteId.toString(),
            organizationName: formData.organizationName,
            companySize: formData.companySize,
            industry: formData.industry,
            completedAt: new Date().toISOString()
          });
        } catch (analyticsError) {
          console.error('Analytics error:', analyticsError);
          // Don't throw - we don't want analytics errors to break the flow
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      siteCreated: true,
    }));

    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboardingStep');
    }

    toast.success('Setup completed successfully!', { id: toastId });
    router.push('/');
  } catch (error: any) {
    console.error('Site creation error:', error);
    toast.error(error.message || 'Failed to create site', { id: toastId });
  } finally {
    setLoading(false);
  }
};

  // Loading state handling
  if (status === 'loading' || step === null) {
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
