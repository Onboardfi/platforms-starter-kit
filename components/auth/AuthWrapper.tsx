// components/auth/AuthWrapper.tsx
import { useSession } from "next-auth/react";
import LoginButton from "@/app/app/(auth)/login/login-button";
import Image from "next/image";
import LoadingDots from "@/components/icons/loading-dots";
import { useSearchParams } from "next/navigation";

export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-1100">
        <LoadingDots color="#A8A29E" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-1100 bg-[url('/grid.svg')] flex items-center justify-center">
        <div className="mx-5 border border-stone-200 py-10 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-lg sm:shadow-md dark:border-stone-700 bg-black">
          <Image
            alt="Logo"
            width={100}
            height={100}
            className="relative mx-auto h-12 w-auto dark:scale-110 dark:rounded-full dark:border dark:border-stone-400"
            src="/logo.png"
          />
          <h1 className="mt-6 text-center font-cal text-3xl text-white">
            Authentication Required
          </h1>
          <p className="mt-2 text-center text-sm text-stone-600 dark:text-stone-400">
            Please sign in to access this internal onboarding
          </p>

          <div className="mx-auto mt-4 w-11/12 max-w-xs sm:w-full">
            <LoginButton returnTo={returnTo} />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;