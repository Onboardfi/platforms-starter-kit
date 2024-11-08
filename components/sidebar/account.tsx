"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Bell, ChevronUp, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";

interface SidebarAccountProps {
  isCollapsed: boolean;
}

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function SidebarAccount({ isCollapsed }: SidebarAccountProps) {
  const [user, setUser] = useState<User | null>(null);

  // Fetch session data on component mount
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      });
  }, []);

  const handleSignOut = (event: Event) => {
    event.preventDefault();
    signOut({ callbackUrl: `/login` });
  };

  if (!user) return null;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-xl p-2",
              "bg-neutral-800/50 hover:bg-neutral-800/70",
              "transition-colors duration-200",
              "group focus:outline-none"
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 shadow-dream overflow-hidden">
              <Image
                src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
                width={36}
                height={36}
                alt={user.name ?? "User avatar"}
                className="h-full w-full rounded-lg object-cover"
              />
            </div>
            
            {!isCollapsed && (
              <>
                <div className="flex flex-1 flex-col items-start text-left">
                  <span className="text-sm font-medium text-neutral-200 truncate max-w-[150px]">
                    {user.name}
                  </span>
                  <span className="text-xs text-neutral-500 truncate max-w-[150px]">
                    {user.email}
                  </span>
                </div>
                <ChevronUp className="h-4 w-4 text-neutral-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn(
            "w-64 border-white/[0.02] bg-neutral-900/90 backdrop-blur-md",
            "animate-in slide-in-from-bottom-2"
          )}
        >
          <div className="flex items-center gap-2 p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-800 overflow-hidden">
              <Image
                src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
                width={36}
                height={36}
                alt={user.name ?? "User avatar"}
                className="h-full w-full rounded-lg object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium text-neutral-200 truncate">
                {user.name}
              </span>
              <span className="text-xs text-neutral-500 truncate">
                {user.email}
              </span>
            </div>
          </div>
          <DropdownMenuSeparator className="bg-white/[0.02]" />
          <DropdownMenuItem className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-medium text-white">
              3
            </span>
          </DropdownMenuItem>
          <Link href="/settings" className="block">
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator className="bg-white/[0.02]" />
          <DropdownMenuItem 
            className="text-red-500 flex items-center gap-2 cursor-pointer"
            onSelect={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}