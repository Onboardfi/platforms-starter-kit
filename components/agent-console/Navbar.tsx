// components/agent-console/Navbar.tsx

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
    <div className="border-b bg-black border-gray-800 mt-3">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex items-center justify-between" aria-label="Tabs">
          <div className="flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm font-mono transition-colors",
                  activeTab === tab.id
                    ? "border-white text-white"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                )}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {!LOCAL_RELAY_SERVER_URL && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newApiKey = prompt('Enter new OpenAI API Key');
                    if (newApiKey) {
                      localStorage.setItem('tmp::voice_api_key', newApiKey);
                      onApiKeyUpdate(newApiKey);
                    }
                  }}
                  className="h-8 text-xs flex items-center"
                >
                  <Edit className="h-3 w-3 mr-2" />
                  API Key: {apiKey ? `${apiKey.slice(0, 3)}...` : 'Not Set'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Click to update API key</p>
              </TooltipContent>
            </Tooltip>
          )}
        </nav>
      </div>
    </div>
  );
}