// components/parts/header.tsx
import { Pin, Slash } from "lucide-react";
import React from "react";

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, children }) => {
  return (
    <section className="flex flex-col space-y-2">
      <h1 className="text-3xl font-cal">{title}</h1>
      {children && (
        <p className="text-lg text-muted-foreground leading-relaxed">
          {children}
        </p>
      )}
    </section>
  );
};