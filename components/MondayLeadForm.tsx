///Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/MondayLeadForm.tsx

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LeadFormData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
}

interface MondayLeadFormProps {
  initialData: Partial<LeadFormData>;
  agentId: string;
  onSave: (data: LeadFormData) => void;
  onCancel: () => void;
}

const MondayLeadForm: React.FC<MondayLeadFormProps> = ({ 
  initialData, 
  agentId,
  onSave,
  onCancel 
}) => {
  // Form state
  const [formData, setFormData] = useState<LeadFormData>({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    source: '',
    notes: ''
  });
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [detailedError, setDetailedError] = useState<any>(null);
  const [integrationStatus, setIntegrationStatus] = useState<{
    connected: boolean;
    settings: Record<string, any>;
  }>({
    connected: false,
    settings: {}
  });

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        company: initialData.company || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        source: initialData.source || '',
        notes: initialData.notes || ''
      });
    }
  }, [initialData]);

  // Check integration status
  useEffect(() => {
    checkIntegrationStatus();
  }, []);

  // Check for auth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mondayConnected = params.get('monday_connected');
    
    if (mondayConnected === 'true') {
      checkIntegrationStatus();
    }
  }, []);

  const checkIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/monday/status', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          setError('Please sign in to use Monday.com integration');
          return;
        }
        throw new Error(error.error || 'Failed to check integration status');
      }

      const data = await response.json();
      setIntegrationStatus(data);
      
      // Store settings in localStorage for persistence
      if (data.settings) {
        localStorage.setItem('monday_settings', JSON.stringify(data.settings));
      }
    } catch (error) {
      console.error('Failed to check integration status:', error);
      setError('Failed to check Monday.com integration status');
    }
  };

  const handleAuth = () => {
    // Store current form data
    localStorage.setItem('pendingLeadData', JSON.stringify(formData));
    // Redirect to Monday.com auth
    window.location.href = '/api/auth/monday';
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setDetailedError(null);

    try {
      if (!formData.firstName || !formData.lastName) {
        throw new Error('First name and last name are required');
      }

      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      console.log('Submitting lead data:', {
        leadData: formData,
        agentId
      });

      const response = await fetch('/api/monday/create-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': agentId
        },
        body: JSON.stringify({
          leadData: formData,
          agentId
        })
      });

      const data = await response.json();

      console.log('API Response:', {
        status: response.status,
        data
      });

      if (!response.ok) {
        // Handle auth errors
        if (response.status === 401 && data.details?.requiresAuth) {
          setDetailedError({
            status: response.status,
            statusText: response.statusText,
            data
          });
          handleAuth();
          return;
        }

        setDetailedError({
          status: response.status,
          statusText: response.statusText,
          data
        });

        throw new Error(data.error || 'Failed to create lead');
      }

      // Success
      toast.success('Lead created successfully');
      localStorage.removeItem('pendingLeadData');
      onSave(formData);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      let userMessage = message;

      if (detailedError?.status === 401) {
        userMessage = 'Authentication needed. Please connect to Monday.com.';
      } else if (detailedError?.status === 404) {
        userMessage = 'Monday.com board not found. Please check configuration.';
      } else if (detailedError?.status === 429) {
        userMessage = 'Too many requests. Please try again later.';
      }

      setError(userMessage);
      toast.error(userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Restore form data after auth redirect
  useEffect(() => {
    if (integrationStatus.connected) {
      const savedData = localStorage.getItem('pendingLeadData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setFormData(parsedData);
          localStorage.removeItem('pendingLeadData');
        } catch (e) {
          console.error('Failed to restore form data:', e);
        }
      }
    }
  }, [integrationStatus.connected]);

  // Form JSX remains the same as your original component
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Show connection status */}
      {!integrationStatus.connected && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>Monday.com integration needs to be connected</span>
            <Button
              type="button"
              onClick={handleAuth}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Connect Monday.com
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {detailedError && (
              <div className="mt-2 text-xs text-gray-400">
                Error Code: {detailedError.status}
                {detailedError.data?.details && (
                  <div>Details: {JSON.stringify(detailedError.data.details)}</div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Rest of your form fields remain exactly the same */}
      {/* ... your existing form fields ... */}

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="font-mono"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting || !integrationStatus.connected}
          className="bg-blue-600 hover:bg-blue-700 font-mono"
        >
          {isSubmitting ? 'Creating...' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
};

export default MondayLeadForm;