import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import LoginButton from "@/app/app/(auth)/login/login-button";
import LoadingDots from "@/components/icons/loading-dots";

export const AuthWrapper = ({ 
  children, 
  loadingFallback,
  loginMessage = "Authentication Required",
  loginSubtext = "Please sign in to access this internal onboarding"
}: { 
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  loginMessage?: string;
  loginSubtext?: string;
}) => {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo");

  // Show loading state
  if (status === "loading") {
    if (loadingFallback) {
      return loadingFallback;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-1100">
        <div className="relative">
          <LoadingDots color="#A8A29E" />
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-1100 bg-[url('/grid.svg')] flex items-center justify-center">
        <div className="mx-5 border border-stone-200 py-10 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-lg sm:shadow-md dark:border-stone-700 bg-black">
          {/* Logo */}
          <div className="relative w-16 h-16 mx-auto">
            <Image
              alt="Logo"
              fill
              className="dark:scale-110 dark:rounded-full dark:border dark:border-stone-400"
              src="/logo.png"
              priority
            />
          </div>

          {/* Login Text */}
          <h1 className="mt-6 text-center font-cal text-3xl text-white">
            {loginMessage}
          </h1>
          <p className="mt-2 text-center text-sm text-stone-600 dark:text-stone-400">
            {loginSubtext}
          </p>

          {/* Login Button */}
          <div className="mx-auto mt-6 w-11/12 max-w-xs sm:w-full">
            <LoginButton returnTo={returnTo} />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
};

export default AuthWrapper;