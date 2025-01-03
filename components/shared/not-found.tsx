//components/shared/not-found.tsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-2">
      <h1 className="text-4xl font-bold mb-4">Not Found</h1>
      <p className="text-xl mb-8">This agent does not have voice interactions enabled.</p>
      <Button asChild>
        <Link href="/settings">
          Configure Voice Settings
        </Link>
      </Button>
    </div>
  );
};