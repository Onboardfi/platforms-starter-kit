// app/actions/organizations.ts
'use server'

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export async function createOrganization(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;

    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });

    if (!response.ok) {
      throw new Error('Failed to create organization');
    }

    // Revalidate all paths since org context changed
    revalidatePath('/', 'layout');
    
    // Redirect with server action
    redirect('/');
    
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Something went wrong');
  }
}