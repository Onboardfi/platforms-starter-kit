// components/parts/header.tsx

import React from "react";

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, children }) => {
  return (
    <section className="flex flex-col space-y-3 relative animate-dream-fade-up">
      <h1 
        className="text-4xl font-cal bg-clip-text text-transparent 
          bg-gradient-to-r from-white via-white/90 to-white/70 
          text-glow"
      >
        {title}
      </h1>
      {children && (
        <p className="text-lg text-neutral-400 leading-relaxed">
          {children}
        </p>
      )}
      {/* Subtle divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mt-4" />
    </section>
  );
};