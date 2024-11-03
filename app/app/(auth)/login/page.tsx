// app/login/page.tsx
import Image from "next/image";
import LoginButton from "@/app/app/(auth)/login/login-button";
import { Suspense } from "react";
import { getToken } from "next-auth/jwt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface LoginPageProps {
  searchParams?: {
    returnTo?: string;
    error?: string;
  };
}

async function getAuthSession() {
  const cookieStore = cookies();

  const token = await getToken({
    req: {
      headers: {
        cookie: cookieStore.toString(),
      },
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAuthSession();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // If the user is already logged in, redirect to the return URL or default page
  if (session) {
    if (searchParams?.returnTo) {
      // Validate returnTo URL
      try {
        const returnToUrl = new URL(searchParams.returnTo);
        if (isDevelopment && returnToUrl.hostname.endsWith('localhost')) {
          redirect(searchParams.returnTo);
        } else if (!isDevelopment && returnToUrl.hostname.endsWith(process.env.NEXT_PUBLIC_ROOT_DOMAIN || '')) {
          redirect(searchParams.returnTo);
        }
      } catch (e) {
        console.error('Invalid returnTo URL:', e);
      }
    }
    redirect('/');
  }

  const errorMessages: Record<string, string> = {
    default: "An error occurred during sign in.",
    configuration: "There is a problem with the server configuration.",
    accessdenied: "You do not have permission to sign in.",
    verification: "The verification link has expired or has already been used.",
  };

  const error = searchParams?.error ? errorMessages[searchParams.error] || errorMessages.default : null;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black">
      <div className="mx-5 w-full max-w-md overflow-hidden border border-stone-200 sm:rounded-2xl sm:shadow-xl dark:border-stone-700">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-stone-200 bg-white px-4 py-6 pt-8 text-center dark:border-stone-700 dark:bg-black sm:px-16">
          <a href="/">
            <Image
              src="/logo.png"
              alt="Logo"
              className="h-10 w-10 rounded-full dark:scale-110 dark:border dark:border-stone-400"
              width={20}
              height={20}
              priority
            />
          </a>
          <h3 className="text-xl font-semibold">Sign In</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Use your GitHub account to continue
          </p>
        </div>

        <div className="bg-white px-4 py-8 dark:bg-black sm:px-16">
          {error && (
            <div className="mb-4 rounded-md bg-red-100 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <Suspense
            fallback={
              <div className="my-2 h-10 w-full animate-pulse rounded-md border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
            }
          >
            <LoginButton returnTo={searchParams?.returnTo} />
          </Suspense>
        </div>
      </div>

      <div className="fixed inset-0 -z-10 h-full w-full bg-[url('/grid.svg')] opacity-10" />
    </div>
  );
}

// Enable static generation but revalidate every 60 seconds
export const revalidate = 60;

// Mark this page as dynamically rendered due to cookie usage
export const dynamic = "force-dynamic";