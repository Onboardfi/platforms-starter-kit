/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/send_email/route.ts

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/email-template';

const resend = new Resend(process.env.RESEND_API_KEY as string);

export async function POST(request: Request) {
  console.log('send_email API route was called.');
  try {
    const { to, subject, firstName} = await request.json();
    console.log('Received data:', { to, subject, firstName });

    // Validate input
    if (!to || !subject || !firstName) {
      console.log('Missing required fields.');
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Send email using Resend
    const data = await resend.emails.send({
      from: 'bobby <bobby@hello.onboardfi.com>', // Ensure this email is verified in Resend
      to: [to],
      subject: subject,
      react: EmailTemplate({ firstName }),
    });

    console.log('Email sent successfully:', data);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email.' }, { status: 500 });
  }
}
