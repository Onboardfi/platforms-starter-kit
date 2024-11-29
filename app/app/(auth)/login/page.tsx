import Image from "next/image";
import LoginButton from "./login-button";
import { Suspense } from "react";
import { getToken } from "next-auth/jwt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { User, Mail, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface LoginPageProps {
  searchParams?: {
    returnTo?: string;
    error?: string;
    mode?: 'login' | 'signup';
    invite?: string;
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
  const mode = searchParams?.mode || 'both';
  const invite = searchParams?.invite;

  if (session) {
    if (searchParams?.returnTo) {
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

  const pageTitle = mode === 'signup' ? 'Create Account' : 
                   mode === 'login' ? 'Welcome Back' : 
                   'Welcome';
  
  const pageDescription = mode === 'signup' ? 'Create your account to get started' :
                         mode === 'login' ? 'Sign in to continue your journey' :
                         'Sign in or create a new account';

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Back Button */}
     
        {/* Main Card */}
        <div className="relative rounded-lg border border-neutral-800 bg-neutral-900 p-8">
          <div className="space-y-8">
            {/* Logo and Title */}
            <div className="text-center">
              <Image
                src="/logo.png"
                alt="Logo"
                width={48}
                height={48}
                className="mx-auto mb-4 rounded-lg border border-neutral-800 p-2 bg-neutral-800/50"
                priority
              />
              <h1 className="text-2xl font-bold text-white mb-2">{pageTitle}</h1>
              <p className="text-sm text-neutral-400">{pageDescription}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Login Buttons */}
            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="h-10 rounded-lg bg-neutral-800 animate-pulse" />
                  <div className="h-10 rounded-lg bg-neutral-800 animate-pulse" />
                </div>
              }
            >
              <div className="space-y-4">
                {(mode === 'login' || mode === 'both') && (
                  <LoginButton returnTo={searchParams?.returnTo} isSignUp={false} />
                )}

                {(mode === 'signup' || mode === 'both') && (
                  <>
                    {mode === 'both' && (
                      <div className="relative flex items-center gap-4 py-4">
                        <div className="flex-grow h-px bg-neutral-800" />
                        <span className="text-sm text-neutral-400">or</span>
                        <div className="flex-grow h-px bg-neutral-800" />
                      </div>
                    )}
                    <LoginButton returnTo={searchParams?.returnTo} isSignUp={true} />
                  </>
                )}
              </div>
            </Suspense>

            {/* Mode Toggle */}
            {mode !== 'both' && (
              <p className="text-center text-sm text-neutral-400">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <Link 
                      href={`/login?mode=signup${invite ? `&invite=${invite}` : ''}`}
                      className="text-white hover:text-neutral-200 transition-colors"
                    >
                      Sign up
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <Link 
                      href="/login?mode=login"
                      className="text-white hover:text-neutral-200 transition-colors"
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </p>
            )}

            {/* Info Card */}
            <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-800/50 text-sm text-neutral-400">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="mb-1">
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="text-white hover:text-neutral-200 transition-colors">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-white hover:text-neutral-200 transition-colors">
                      Privacy Policy
                    </Link>
                  </p>
                  <p className="text-xs text-neutral-500">
                    We use secure, encrypted authentication to protect your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 60;
export const dynamic = "force-dynamic";