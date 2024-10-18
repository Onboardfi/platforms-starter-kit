// components/form/index.tsx

'use client';

import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { useFormStatus } from 'react-dom';
import DomainStatus from './domain-status';
import DomainConfiguration from './domain-configuration';
import Uploader from './uploader';
import { useState } from 'react';
import { UpdateAgentMetadataResponse } from '@/lib/types';

export default function Form({
  title,
  description,
  helpText,
  inputAttrs,
  agentId,
}: {
  title: string;
  description: string;
  helpText: string;
  inputAttrs: {
    name: string;
    type: string;
    defaultValue: string;
    placeholder?: string;
    maxLength?: number;
    pattern?: string;
  };
  agentId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/updateAgentMetadata', {
      method: 'POST',
      body: formData, // Ensure FormData is sent correctly
    });

    const result: UpdateAgentMetadataResponse = await response.json();

    if (response.ok && result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'An unexpected error occurred.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-black"
    >
      {/* Hidden inputs to pass agentId and key to the Server Action */}
      <input type="hidden" name="agentId" value={agentId} />
      {/* 'key' is not used in batch updates; remove if unnecessary */}
      {/* <input type="hidden" name="key" value={inputAttrs.name} /> */}

      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-cal text-xl dark:text-white">{title}</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {description}
        </p>

        {inputAttrs.name === 'image' || inputAttrs.name === 'logo' ? (
          <Uploader
            defaultValue={inputAttrs.defaultValue}
            name={inputAttrs.name as "image" | "logo" | "value"} // Ensure correct typing
          />
        ) : inputAttrs.name === 'font' ? (
          <div className="flex max-w-sm items-center overflow-hidden rounded-lg border border-stone-600">
            <select
              name="font" // Update if necessary
              defaultValue={inputAttrs.defaultValue}
              className="w-full rounded-none border-none bg-white px-4 py-2 text-sm font-medium text-stone-700 focus:outline-none focus:ring-black dark:bg-black dark:text-stone-200 dark:focus:ring-white"
            >
              <option value="font-cal">Cal Sans</option>
              <option value="font-lora">Lora</option>
              <option value="font-work">Work Sans</option>
            </select>
          </div>
        ) : inputAttrs.name === 'subdomain' ? (
          <div className="flex w-full max-w-md">
            <input
              {...inputAttrs}
              name="subdomain" // Use specific name
              required
              className="z-10 flex-1 rounded-l-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
            />
            <div className="flex items-center rounded-r-md border border-l-0 border-stone-300 bg-stone-100 px-3 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400">
              {process.env.NEXT_PUBLIC_ROOT_DOMAIN}
            </div>
          </div>
        ) : inputAttrs.name === 'customDomain' ? (
          <div className="relative flex w-full max-w-md">
            <input
              {...inputAttrs}
              name="customDomain" // Use specific name
              className="z-10 flex-1 rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
            />
            {inputAttrs.defaultValue && (
              <div className="absolute right-3 z-10 flex h-full items-center">
                <DomainStatus domain={inputAttrs.defaultValue} />
              </div>
            )}
          </div>
        ) : inputAttrs.name === 'description' ? (
          <textarea
            {...inputAttrs}
            name="description" // Use specific name
            rows={3}
            required
            className="w-full max-w-xl rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
          />
        ) : (
          <input
            {...inputAttrs}
            name={inputAttrs.name} // Use specific name
            required
            className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
          />
        )}
      </div>

      {inputAttrs.name === 'customDomain' && inputAttrs.defaultValue && (
        <DomainConfiguration domain={inputAttrs.defaultValue} />
      )}

      <div className="flex flex-col items-center justify-center space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 sm:flex-row sm:justify-between sm:space-y-0 sm:px-10 dark:border-stone-700 dark:bg-stone-800">
        <p className="text-sm text-stone-500 dark:text-stone-400">{helpText}</p>
        <FormButton />
      </div>

      {/* Display Error and Success Messages */}
      {error && <p className="mt-2 text-red-500">{error}</p>}
      {success && <p className="mt-2 text-green-500">Update successful!</p>}
    </form>
  );
}

function FormButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit" // Ensure the button submits the form
      className={cn(
        'flex h-8 w-32 items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none sm:h-10',
        pending
          ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
          : 'border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800'
      )}
      disabled={pending}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Save Changes</p>}
    </button>
  );
}
