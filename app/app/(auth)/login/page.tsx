import Image from "next/image";
import LoginButton from "./login-button";
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      
      <div className="flex flex-col md:flex-row w-[450px] md:w-[800px] md:h-[540px] bg-neutral-800/80 backdrop-blur-md rounded-3xl shadow-2xl relative animate-dream-fade-up overflow-hidden">
        <div className="hidden md:block md:w-1/2 h-full relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
          
          <div className="absolute bottom-4 left-0 w-full z-10">
            <h1 className="text-[160px] h-[170px] relative text-left pl-8">
              <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-b from-white/20 to-white/0">
                OnboardFi
              </span>
            </h1>
          </div>

          <div className="absolute top-8 left-8 text-white/80 max-w-[280px]">
            <h2 className="text-xl font-light mb-2">Welcome Back</h2>
            <p className="text-sm font-light text-white/50">
              Sign in to continue your journey with our AI-powered platform
            </p>
          </div>
        </div>

        <div className="md:w-1/2 p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <Image
              src="/logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="mx-auto mb-4 rounded-xl border border-white/10 p-2 bg-white/5"
              priority
            />
            <h3 className="text-xl font-light text-white mb-2">Sign In</h3>
            <p className="text-sm text-white/50">
              Use your GitHub account to continue
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
              {error}
            </div>
          )}

          <Suspense
            fallback={
              <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
            }
          >
            <LoginButton returnTo={searchParams?.returnTo} />
          </Suspense>

          <p className="mt-6 text-center text-xs text-white/30">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 60;
export const dynamic = "force-dynamic";