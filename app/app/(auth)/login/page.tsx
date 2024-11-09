import Image from "next/image";
import { getToken } from "next-auth/jwt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LoginButton from "./login-button";
import { Suspense } from "react";

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

  // If user is already logged in, redirect
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 animate-fade-in" />
      
      <div className="flex flex-col md:flex-row w-[450px] md:w-[800px] md:h-[540px] bg-neutral-800/80 backdrop-blur-md rounded-3xl shadow-dream-lg shine relative animate-dream-fade-up">
        <div className="hidden md:block md:w-1/2 h-full relative overflow-hidden">
          <Image 
            src="/grid.svg"
            alt="Background Pattern"
            width={800}
            height={540}
            className="w-full h-full object-cover absolute opacity-10"
          />
          
          <div className="absolute bottom-4 left-0 w-full z-10">
            <h1 className="text-[160px] h-[170px] relative text-left">
              <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-b from-white/20 to-white/0">
                Dream
              </span>
            </h1>
          </div>
        </div>

        <div className="md:w-1/2 p-6 sm:p-8 w-full h-full flex flex-col justify-center max-w-[320px] mx-auto">
          <Image
            src="/logo.png"
            alt="Logo"
            width={96}
            height={96}
            className="h-10 w-10 rounded-full dark:scale-110 dark:border dark:border-stone-400 mx-auto animate-dream-fade-up"
            priority
          />
          
          <h2 className="font-medium mb-2 text-neutral-100 text-center animate-dream-fade-up">
            Sign In
          </h2>

          <hr className="border-0 h-[1px] bg-gradient-to-r from-white/0 via-white/10 to-white/0 mb-2" />

          <p className="text-sm mb-4 text-white/50 text-center">
            Use your GitHub account to continue
          </p>

          {error && (
            <div className="mb-4 p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-start">
              <span>{error}</span>
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
    </div>
  );
}

export const revalidate = 60;
export const dynamic = "force-dynamic";