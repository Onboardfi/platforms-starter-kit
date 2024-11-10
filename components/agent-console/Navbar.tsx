import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit } from "lucide-react";
import { TABS } from "./utils/constants";
import { NavbarProps } from "./utils/types";
import { cn } from "@/lib/utils";

export function Navbar({ 
  LOCAL_RELAY_SERVER_URL, 
  apiKey, 
  activeTab, 
  setActiveTab, 
  onApiKeyUpdate 
}: NavbarProps) {
  return (
    <div className="border-b border-white/[0.08] bg-neutral-900/50 backdrop-blur-md mt-3">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav 
          className="-mb-px flex items-center justify-between" 
          aria-label="Tabs"
        >
          {/* Tabs Container */}
          <div className="flex space-x-1">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  // Base styles
                  "relative group px-4 py-2 rounded-xl font-light text-sm transition-all duration-300",
                  // State styles
                  activeTab === tab.id
                    ? "text-white bg-white/5 shadow-dream" 
                    : "text-white/50 hover:text-white/80 hover:bg-white/5",
                  // Animation
                  "animate-dream-fade-up"
                )}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Active Tab Indicator */}
                {activeTab === tab.id && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-dream-pink/20 via-transparent to-dream-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}

                {/* Tab Name */}
                <span className="relative z-10 font-mono">
                  {tab.name}
                </span>

                {/* Bottom Border Gradient for Active Tab */}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-dream-pink to-dream-cyan" />
                )}
              </button>
            ))}
          </div>

          {/* API Key Button */}
          {!LOCAL_RELAY_SERVER_URL && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    const newApiKey = prompt('Enter new OpenAI API Key');
                    if (newApiKey) {
                      localStorage.setItem('tmp::voice_api_key', newApiKey);
                      onApiKeyUpdate(newApiKey);
                    }
                  }}
                  className={cn(
                    // Base styles
                    "relative group h-9 px-4 rounded-xl text-xs",
                    "bg-neutral-800/50 border border-white/10",
                    "hover:bg-neutral-700/50 hover:border-white/20",
                    "transition-all duration-300 shine shadow-dream",
                    // Animation
                    "animate-dream-fade-up"
                  )}
                  style={{ animationDelay: "0.4s" }}
                >
                  {/* Button Gradient Overlay */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-dream-pink/10 via-transparent to-dream-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Button Content */}
                  <div className="relative flex items-center space-x-2">
                    <Edit className="h-3 w-3 text-white/70" />
                    <span className="text-white/70">
                      API Key: {apiKey ? `${apiKey.slice(0, 3)}...` : 'Not Set'}
                    </span>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent 
                className="bg-neutral-800/90 border border-white/10 text-white/70 backdrop-blur-md rounded-lg px-2 py-1"
              >
                <p className="text-xs">Click to update API key</p>
              </TooltipContent>
            </Tooltip>
          )}
        </nav>
      </div>

      {/* Gradient Border Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
    </div>
  );
}