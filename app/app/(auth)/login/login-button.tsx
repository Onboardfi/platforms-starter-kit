///Users/bobbygilbert/Documents/Github/platforms-starter-kit/app/app/(auth)/login/login-button.tsx

"use client";

import LoadingDots from "@/components/icons/loading-dots";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

interface LoginButtonProps {
  returnTo?: string | null;
}

export default function LoginButton({ returnTo }: LoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signIn("github", {
        callbackUrl: "/onboarding",
        redirect: true
      });
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to login');
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={handleLogin}
      className={`
        w-full px-4 py-3 rounded-xl flex items-center justify-center
        transition-all duration-300 shadow-lg
        ${loading 
          ? 'bg-neutral-700/50 cursor-not-allowed' 
          : 'bg-white/5 hover:bg-white/10 active:bg-white/15'
        }
        border border-white/10 hover:border-white/20
        group relative overflow-hidden
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-center space-x-3">
        {loading ? (
          <LoadingDots color="#A8A29E" />
        ) : (
          <>
            <svg
              className="w-5 h-5 text-white opacity-75"
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="text-sm font-light text-white/90">
              Continue with GitHub
            </span>
          </>
        )}
      </div>
    </button>
  );
}