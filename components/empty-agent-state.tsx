"use client";

import React from 'react';
import { Bot, Sparkles, Globe, Users } from 'lucide-react';
import CreateAgentButton from './create-agent-button';

interface EmptyAgentStateProps {
  siteId: string;
  organizationId: string;
}

export function EmptyAgentState({ siteId, organizationId }: EmptyAgentStateProps) {
  return (
    <div className="relative p-8 bg-neutral-900 rounded-xl border border-white/[0.02] overflow-hidden shine shadow-dream">
      {/* Background gradient effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-dream-cyan/5 via-dream-cyan/10 to-dream-cyan/5" 
        style={{ filter: "blur(40px)" }} 
      />
      
      <div className="relative space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dream-cyan/10">
            <Bot className="w-8 h-8 text-dream-cyan" />
          </div>
          <div>
            <div className="inline-block px-3 py-1 bg-dream-cyan/10 rounded-full text-dream-cyan text-xs mb-2">
              GET STARTED
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Create Your First Agent
            </h2>
          </div>
          <p className="text-neutral-400 max-w-2xl">
            Deploy intelligent AI agents that provide real-time assistance and personalized guidance 
            throughout the onboarding journey.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.05] group hover:bg-white/[0.04] transition-all duration-200">
            <Bot className="w-6 h-6 text-dream-cyan mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-medium mb-2">Voice-to-Voice AI</h3>
            <p className="text-sm text-neutral-400">
              Create natural conversational flows with advanced AI technology
            </p>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.05] group hover:bg-white/[0.04] transition-all duration-200">
            <Globe className="w-6 h-6 text-dream-cyan mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-medium mb-2">Dynamic UI/UX</h3>
            <p className="text-sm text-neutral-400">
              Build adaptive interfaces that evolve based on user interactions
            </p>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.05] group hover:bg-white/[0.04] transition-all duration-200">
            <Users className="w-6 h-6 text-dream-cyan mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-medium mb-2">24/7 Support</h3>
            <p className="text-sm text-neutral-400">
              Provide round-the-clock assistance without increasing support staff
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col items-center space-y-4">
          <div className="transform scale-125">
            <CreateAgentButton siteId={siteId} />
          </div>
          <p className="text-sm text-neutral-400">
            Get started with AI-powered onboarding in minutes
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmptyAgentState;