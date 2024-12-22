//components/parts/breadcrumbs.tsx

"use client"
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import Image from "next/image";
import Icon from "@/public/icon.svg";
import { UserPlus, HelpCircle } from "lucide-react";
import { 
  NovuProvider, 
  PopoverNotificationCenter,
  type IMessage,
} from "@novu/notification-center";

export const Breadcrumbs = ({
  pageName,
  isLoading,
}: {
  pageName?: string;
  isLoading?: boolean;
}) => {
  const novuAppId = process.env.NEXT_PUBLIC_NOVU_APP_ID || "poGNvE9DINlv";
  const subscriberId = "default-user";

  const handleNotificationClick = (message: IMessage) => {
    console.log('Notification clicked:', message);
    
    const ctaUrl = typeof message.cta?.data?.url === 'string' 
      ? message.cta.data.url 
      : typeof message.payload?.url === 'string'
        ? message.payload.url
        : null;

    if (ctaUrl) {
      window.location.href = ctaUrl;
    }
  };

  return (
    <TooltipProvider>
      <NovuProvider 
        subscriberId={subscriberId} 
        applicationIdentifier={novuAppId}
        backendUrl="https://api.novu.co"
        socketUrl="wss://ws.novu.co"
      >
        <Breadcrumb
          className="relative h-[67.63px] flex items-center justify-between p-6 rounded-xl border border-white/[0.02] bg-neutral-900/80 backdrop-blur-md shadow-dream shine overflow-hidden"
        >
          {/* Background Elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
          </div>

          {/* Left side: Breadcrumbs */}
          <BreadcrumbList className="relative z-10">
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/"
                className="text-neutral-400 hover:text-white transition-colors duration-300"
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-neutral-600" />
            <BreadcrumbPage
              className="px-3 py-1.5 border border-white/[0.02] bg-neutral-800/50 rounded-lg shine shadow-dream-sm"
            >
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <BreadcrumbLink className="text-white">
                  {pageName || "Dashboard"}
                </BreadcrumbLink>
              )}
            </BreadcrumbPage>
          </BreadcrumbList>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2 relative z-10">
            {/* Invite Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg border border-white/[0.02] bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="sr-only">Invite Team Member</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Invite Team Member</TooltipContent>
            </Tooltip>

            {/* Novu Notifications */}
            <PopoverNotificationCenter
              onNotificationClick={handleNotificationClick}
              colorScheme="dark"
              position="bottom-end"
              offset={12}
            >
              {({ unseenCount }) => (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="outline-none">
                      <div className="h-9 w-9 rounded-lg border border-white/[0.02] bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all duration-200 relative flex items-center justify-center">
                        <HelpCircle className="h-4 w-4" />
                        {Boolean(unseenCount) && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-indigo-500 text-[10px] font-medium text-white flex items-center justify-center">
                            {unseenCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {unseenCount ? `${unseenCount} new notifications` : 'Notifications'}
                  </TooltipContent>
                </Tooltip>
              )}
            </PopoverNotificationCenter>

            {/* Help */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg border border-white/[0.02] bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all duration-200"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="sr-only">Help</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help & Resources</TooltipContent>
            </Tooltip>

            {/* Logo */}
            <div className="ml-2 pl-2 border-l border-white/[0.02]">
              <Image
                className="relative z-10 transition-all duration-500 hover:scale-110 hover:brightness-125"
                src={Icon}
                width={24}
                height={24}
                alt="Router.so Icon"
              />
            </div>
          </div>
        </Breadcrumb>
      </NovuProvider>
    </TooltipProvider>
  );
};

export default Breadcrumbs;