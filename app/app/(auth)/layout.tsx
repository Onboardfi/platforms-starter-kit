// app/(auth)/layout.tsx

import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "OnboardFi – AI Powered Onboarding.",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Animated Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm"></div>
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-rotate"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-rotate-reverse"></div>
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
}

/* Tailwind CSS Animations (Add these to your global CSS or Tailwind config)

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rotate-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.animate-rotate {
  animation: rotate 20s linear infinite;
}

.animate-rotate-reverse {
  animation: rotate-reverse 25s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.4; }
}

.animate-pulse {
  animation: pulse 2s infinite;
}

*/
