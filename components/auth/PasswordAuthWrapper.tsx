///Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/auth/PasswordAuthWrapper.tsx

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import LoadingDots from "@/components/icons/loading-dots";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { AxiosError } from "axios";

// TypeScript interfaces
interface AuthResponse {
  success: boolean;
  error?: string;
  requiresAuth?: boolean;
  agentId?: string;
  agentName?: string;
  authMessage?: string;
  userId?: string;
  isAnonymous?: boolean;
  isAuthenticated?: boolean;
}

interface PasswordAuthWrapperProps {
  children: React.ReactNode;
  agentId: string;
  siteName?: string;
  authMessage?: string;
}

export const PasswordAuthWrapper = ({ 
  children, 
  agentId,
  siteName = "Internal Onboarding",
  authMessage = "Please enter the password to access this internal onboarding"
}: PasswordAuthWrapperProps) => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState(agentId);
  const [authState, setAuthState] = useState({
    displayName: siteName,
    displayMessage: authMessage,
    requiresAuth: false
  });

  // Effect to check existing authentication
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const response = await apiClient.get<AuthResponse>("/api/auth/verify-onboarding-token", {
          params: { agentId },
          headers: {
            "x-agent-id": agentId,
          },
        });

        if (response.data.success) {
          setIsAuthenticated(true);
        } else if (response.data.requiresAuth) {
          setAuthState({
            displayName: response.data.agentName || siteName,
            displayMessage: response.data.authMessage || authMessage,
            requiresAuth: true
          });
        }
      } catch (e) {
        const error = e as AxiosError<AuthResponse>;
        
        if (error.response?.status === 401) {
          const data = error.response.data;
          setAuthState({
            displayName: data?.agentName || siteName,
            displayMessage: data?.authMessage || authMessage,
            requiresAuth: data?.requiresAuth || false
          });
          
          if (data?.agentId) {
            setCurrentAgentId(data.agentId);
          }

          if (data?.requiresAuth) {
            setAuthState(prev => ({
              ...prev,
              requiresAuth: true
            }));
          }
        } else {
          console.error("Auth check error:", error);
          toast.error("Failed to verify authentication");
        }
      } finally {
        setIsInitializing(false);
      }
    };

    if (agentId) {
      checkExistingAuth();
    }
  }, [agentId, siteName, authMessage]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiClient.post<AuthResponse>("/api/auth/verify-onboarding-password", {
        agentId: currentAgentId,
        password,
      }, {
        headers: {
          "x-agent-id": currentAgentId,
        },
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        toast.success("Successfully authenticated");
      } else {
        toast.error(response.data.error || "Invalid password");
        setPassword("");
      }
    } catch (e) {
      const error = e as AxiosError<AuthResponse>;
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.status === 404) {
        toast.error("Agent configuration not found");
      } else if (error.response?.status === 403) {
        toast.error("Authentication not enabled for this agent");
      } else {
        console.error("Authentication error:", error);
        toast.error("Authentication failed");
      }
      
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        <div className="relative">
          <LoadingDots color="#A8A29E" />
        </div>
      </div>
    );
  }

  // If authenticated or auth not required, render children
  if (isAuthenticated || !authState.requiresAuth) {
    return <>{children}</>;
  }


  // Main authentication form render
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      
      {/* Main container */}
      <div className="flex flex-col md:flex-row w-[450px] md:w-[800px] md:h-[540px] bg-neutral-800/80 backdrop-blur-md rounded-3xl shadow-2xl relative animate-dream-fade-up overflow-hidden">
        
        {/* Left column - Decorative (hidden on mobile) */}
        <div className="hidden md:block md:w-1/2 h-full relative">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20" />
          
          {/* Animated grid pattern */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30 animate-dream-pulse" />
          
          {/* Bottom text "Dream" */}
          <div className="absolute bottom-4 left-0 w-full z-10">
            <h1 className="text-[160px] h-[170px] relative text-left pl-8">
              <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-b from-white/20 to-white/0">
                Dream
              </span>
            </h1>
          </div>

          {/* Top content */}
          <div className="absolute top-8 left-8 text-white/80 max-w-[280px]">
            <h2 className="text-xl font-light mb-2">{authState.displayName}</h2>
            <p className="text-sm font-light text-white/50">
              {authState.displayMessage}
            </p>
          </div>
        </div>

        {/* Right column - Auth form */}
        <div className="md:w-1/2 p-8 flex flex-col justify-center relative">
          {/* Logo and header section */}
          <div className="text-center mb-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                className="rounded-xl border border-white/10 p-2 bg-white/5"
                priority
              />
            </div>
            
            {/* Mobile-only headers */}
            <div className="md:hidden space-y-2">
              <h3 className="text-xl font-light text-white">
                {authState.displayName}
              </h3>
              <p className="text-sm text-white/50">
                {authState.displayMessage}
              </p>
            </div>
          </div>

          {/* Authentication form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password input group */}
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                         text-white placeholder-white/30 focus:border-white/20 
                         focus:ring-1 focus:ring-white/20 outline-none 
                         transition-all duration-300 group-hover:border-white/20"
                required
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full px-4 py-3 rounded-xl flex items-center justify-center
                transition-all duration-300 group relative overflow-hidden
                ${isLoading 
                  ? 'bg-neutral-700/50 cursor-not-allowed' 
                  : 'bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-white/20'
                }
              `}
            >
              {/* Button gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Button content */}
              <div className="relative flex items-center justify-center space-x-2">
                {isLoading ? (
                  <LoadingDots color="#A8A29E" />
                ) : (
                  <span className="text-sm font-light text-white/90">
                    Continue
                  </span>
                )}
              </div>
            </button>
          </form>

          {/* Footer text */}
          <p className="mt-6 text-center text-xs text-white/30">
            Protected content • Enter password to continue
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordAuthWrapper;