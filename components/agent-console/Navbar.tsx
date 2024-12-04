///Users/bobbygilbert/Documents/Github/platforms-starter-kit/components/agent-console/Navbar.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface NavbarProps {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  primaryColor: string;
  secondaryColor: string;
  tabs: { name: string; id: string }[];
}

export function Navbar({
  activeTab,
  setActiveTab,
  primaryColor,
  secondaryColor,
  tabs,
}: NavbarProps) {
  return (
    <div className="sticky top-0 left-0 right-0 z-30 border-b border-white/[0.08] bg-background/60 backdrop-blur-dream">
      <div className="px-4 sm:px-6 lg:px-8">
        <nav
          className="-mb-px flex items-center justify-between"
          aria-label="Tabs"
        >
          {/* Tabs Container */}
          <div className="flex space-x-1">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  // Base styles
                  'relative group px-4 py-2 rounded-xl font-light text-sm transition-all duration-300',
                  // State styles
                  activeTab === tab.id
                    ? 'text-white bg-white/5 shadow-dream'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                  // Animation
                  'shine'
                )}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {/* Active Tab Indicator */}
                {activeTab === tab.id && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor}33, ${secondaryColor}33)`,
                    }}
                  />
                )}

                {/* Tab Name */}
                <span className="relative z-10 font-mono">{tab.name}</span>

                {/* Bottom Border Gradient for Active Tab */}
                {activeTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Gradient Border Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${primaryColor}33, transparent)`,
        }}
      />
    </div>
  );
}