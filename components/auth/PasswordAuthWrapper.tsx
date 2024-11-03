// components/auth/PasswordAuthWrapper.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import LoadingDots from "@/components/icons/loading-dots";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { AxiosError } from "axios";

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

          // Enable password form if authentication is required
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

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-1100 flex items-center justify-center">
        <LoadingDots color="#A8A29E" />
      </div>
    );
  }

  // If authenticated or auth not required, render children
  if (isAuthenticated || !authState.requiresAuth) {
    return <>{children}</>;
  }

  // Render password form if authentication is required
  return (
    <div className="min-h-screen bg-gray-1100 bg-[url('/grid.svg')] flex items-center justify-center">
      <div className="mx-5 border border-stone-200 py-10 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-lg sm:shadow-md dark:border-stone-700 bg-black">
        <div className="relative mx-auto h-12 w-12">
          <Image
            alt="Logo"
            fill
            className="rounded-full dark:border dark:border-stone-400"
            src="/logo.png"
          />
        </div>
        <h1 className="mt-6 text-center font-cal text-3xl text-white">
          {authState.displayName}
        </h1>
        <p className="mt-2 text-center text-sm text-stone-600 dark:text-stone-400">
          {authState.displayMessage}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 px-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-2 rounded border border-stone-700 bg-black text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full mt-4 py-2 px-4 rounded transition-colors duration-200
              ${isLoading 
                ? "bg-stone-800 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700"}
              text-white font-medium
            `}
          >
            {isLoading ? <LoadingDots color="#A8A29E" /> : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordAuthWrapper;