// app/(auth)/invite-error/page.tsx

import Link from 'next/link';

export default function InviteErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-5 max-w-xl text-center">
        <h1 className="mb-6 text-4xl font-bold">Invalid Invitation</h1>
        <p className="mb-6 text-lg text-gray-600">
          The invitation link you used might be expired, invalid, or already accepted.
        </p>
        <p className="mb-10 text-gray-600">
          Please contact the person who invited you to get a new invitation.
        </p>
        <Link
          href="/"
          className="rounded-lg border border-black bg-black px-6 py-3 text-sm text-white transition-all hover:bg-white hover:text-black"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}