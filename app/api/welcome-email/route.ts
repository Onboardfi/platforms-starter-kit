// app/api/welcome-email/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { OnboardFiWelcomeEmail } from '@/components/emails/OnboardFiWelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, firstName, organizationName } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
        from: 'OnboardFi <welcome@hello.onboardfi.com>', // Updated to use verified domain

      to: [email],
      subject: 'Welcome to OnboardFi! 🚀',
      react: OnboardFiWelcomeEmail({ 
        firstName, 
        organizationName
      }),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}