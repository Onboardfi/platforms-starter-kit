// components/ui/sidebar/index.tsx
"use client";

import * as React from "react";
import { usePathname, useParams, useSelectedLayoutSegments } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    BarChart3,
    Globe,
    LayoutDashboard,
    Menu,
    Database,
    Newspaper,
    Settings,
    ChevronLeft,
    ChevronRight,
    Users,
    Boxes
} from "lucide-react";
import { FaFacebook, FaTwitter, FaLinkedin } from "react-icons/fa"; // Import social media icons
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { UpgradeCTA } from "@/components/UpgradeCTA";
import { SidebarHoverCard } from "@/components/sidebar/hover-card";
import { SidebarGroupLabel } from "@/components/sidebar/group-label";
import { SidebarSearch } from "@/components/sidebar/search";
import { SidebarAccount } from "@/components/sidebar/account";
import { SubscriptionTier } from "@/lib/stripe-config";

// Import SWR for data fetching
import useSWR from 'swr';

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Context Types
interface SidebarContextProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  hoveredItem: string | null;
  setHoveredItem: (item: string | null) => void;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(undefined);

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

  return (
    <SidebarContext.Provider 
      value={{ 
        isOpen, 
        setIsOpen, 
        isCollapsed, 
        setIsCollapsed,
        hoveredItem,
        setHoveredItem 
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { 
    isOpen, 
    setIsOpen, 
    isCollapsed, 
    setIsCollapsed 
  } = useSidebar();
  const pathname = usePathname();

  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  return (
    <>
      {/* Mobile Menu Trigger */}
      <button
        className="fixed right-4 top-4 z-40 p-2.5 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 text-neutral-400 backdrop-blur-md transition-all duration-500 shine shadow-dream md:hidden group/button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ animation: "blurUp 0.5s ease-out forwards" }}
      >
        <Menu className="h-5 w-5 transition-transform duration-300 group-hover/button:scale-110" />
        <span className="sr-only">Toggle Menu</span>
      </button>
      
      {/* Sidebar Container */}
      <motion.div
        initial={{ x: -320 }}
        animate={{
          x: isOpen || window.innerWidth >= 768 ? 0 : -320,
          width: isCollapsed ? 80 : 280, // Sidebar width
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className={cn(
          "fixed z-30 flex h-full flex-col",
          "border-r border-white/[0.02]",
          "bg-neutral-900/80 backdrop-blur-md",
          "transition-all duration-500",
          "shine shadow-dream"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-4 relative overflow-hidden">
          <Link 
            href="/" 
            className="flex items-center space-x-2 transition-transform duration-300"
          >
            <Image
              src="/onboardfi-logo-q4.png"
              width={isCollapsed ? 40 : 150}
              height={40}
              alt="OnboardFi Logo"
              className="dark:brightness-200 transition-all duration-500"
              style={{ animation: "blurUp 0.6s 0.1s forwards" }}
            />
          </Link>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 overflow-hidden flex flex-col">
          {children}
          
          {/* Collapse Toggle */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "absolute -right-6 top-6 hidden md:flex", // Adjusted positioning
              "h-6 w-6 items-center justify-center",
              "rounded-full border border-white/[0.02]",
              "bg-neutral-900/80 backdrop-blur-md",
              "hover:bg-neutral-800/50 text-neutral-400",
              "shine shadow-dream",
              "transition-transform duration-300 hover:scale-110",
              "group/toggle z-50" // Added z-index
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isCollapsed ? "right" : "left"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 transition-colors group-hover/toggle:text-white" />
                ) : (
                  <ChevronLeft className="h-4 w-4 transition-colors group-hover/toggle:text-white" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Footer Divider */}
          <div className="border-t border-white/[0.02] mt-4"></div>

          {/* Footer Section */}
          <SidebarFooter />
        </div>
      </motion.div>
    </>
  );
}

// Sidebar Content Component
export function SidebarContent() {
  const { isCollapsed, hoveredItem, setHoveredItem } = useSidebar();
  const segments = useSelectedLayoutSegments();
  const pathname = usePathname();
  const { siteId, id: agentId } = useParams() as { siteId?: string; id?: string };

  // Fetch the user's sites
  const { data: sites, error } = useSWR('/api/sites', fetcher);

  // Always call hooks at the top
  const hasSite = sites && sites.length > 0;
  const userSiteId = hasSite ? sites[0].id : null;

  const tabs = React.useMemo(() => {

    if (segments[0] === "agent" && agentId) {
      return [
        
        {
          id: "agent-overview",
          name: "Editor",
          href: `/agent/${agentId}`,
          isActive: segments.length === 2,
          icon: <Users className="h-4 w-4" />,
          description: "Manage your agent"
        },
        {
          id: "agent-settings",
          name: "Settings",
          href: `/agent/${agentId}/settings`,
          isActive: segments.includes("settings"),
          icon: <Settings className="h-4 w-4" />,
          description: "Agent settings"
        },
        {
          id: "agent-analytics",
          name: "Analytics",
          href: `/agent/${agentId}/analytics`,
          isActive: segments.includes("analytics"),
          icon: <BarChart3 className="h-4 w-4" />,
          description: "View agent analytics"
        }
      ];
    }

    if (segments[0] === "site" && siteId) {
      return [
        {
          id: "back",
          name: "Back to All Sites",
          href: "/sites",
          icon: <ArrowLeft className="h-4 w-4" />,
          description: "Return to sites overview",
          isActive: false
        },
        {
          id: "onboards",
          name: "Onboards",
          href: `/site/${siteId}`,
          isActive: segments.length === 2,
          icon: <Newspaper className="h-4 w-4" />,
          description: "Manage your onboarding flows"
        },
        {
          id: "analytics",
          name: "Analytics",
          href: `/site/${siteId}/analytics`,
          isActive: segments.includes("analytics"),
          icon: <BarChart3 className="h-4 w-4" />,
          description: "Track onboarding metrics"
        },
      ];
    }

    return [
      {
        id: "overview",
        name: "Overview",
        href: "/",
        isActive: pathname === "/",
        icon: <LayoutDashboard className="h-4 w-4" />,
        description: "Dashboard overview"
      },
      hasSite
        ? {
            id: "onboards",
            name: "Onboards",
            href: `/site/${userSiteId}`,
            isActive: pathname === `/site/${userSiteId}`,
            icon: <Newspaper className="h-4 w-4" />,
            description: "Manage your onboarding flows"
          }
        : {
            id: "sites",
            name: "Sites",
            href: "/sites",
            isActive: pathname === "/sites",
            icon: <Globe className="h-4 w-4" />,
            description: "Manage your sites"
          },
      {
        id: "integrations",
        name: "Integrations",
        href: "/integrations",
        isActive: pathname === "/integrations",
        icon: <Boxes className="h-4 w-4" />,
        description: "Connect your tools and services"
      },
      {
        id: "storage",
        name: "Storage",
        href: "/storage",
        isActive: pathname === "/storage",
        icon: <Database className="h-4 w-4" />,
        description: "Manage your storage",
      }
    ];
  }, [segments, siteId, agentId, pathname, hasSite, userSiteId]);

  // Handle loading and error states after hooks
  if (error) {
    return <div className="p-4 text-red-500">Error loading sidebar</div>;
  }

  if (!sites) {
    return (
      <div className="flex items-center justify-center p-4">
        <svg
          className="animate-spin h-5 w-5 text-neutral-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
        <span className="ml-2 text-neutral-400">Loading sidebar...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Search Bar */}
      {!isCollapsed && (
        <SidebarSearch className="mb-2" />
      )}

      {/* Navigation Groups */}
      <div className="space-y-4">
        <div>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <nav className="mt-2 grid gap-1">
            {tabs.map((tab, index) => (
              <Link
                key={tab.id}
                href={tab.href}
                onMouseEnter={() => setHoveredItem(tab.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "group relative flex items-center gap-3",
                  "rounded-xl px-3 py-2.5",
                  "text-sm font-light",
                  "transition-all duration-300",
                  "hover:bg-white/[0.02]",
                  tab.isActive && "bg-white/[0.04] text-white",
                  !tab.isActive && "text-neutral-400",
                  "overflow-hidden"
                )}
                style={{ 
                  opacity: 0, 
                  animation: `blurUp 0.5s ${0.1 + index * 0.05}s forwards`
                }}
              >
                {/* Icon Container */}
                <div className={cn(
                  "flex items-center justify-center",
                  "w-9 h-9 rounded-lg",
                  "transition-all duration-300",
                  "bg-gradient-to-br",
                  tab.isActive
                  ? "from-custom-green/20 to-custom-green-light/20 text-custom-green-light"
                  : "from-neutral-800/50 to-neutral-900/50 group-hover:from-neutral-800/70 group-hover:to-neutral-900/70"
                )}>
                  {tab.icon}
                </div>

                {/* Label */}
                {!isCollapsed && (
                  <span className="transition-all duration-300 group-hover:translate-x-0.5">
                    {tab.name}
                  </span>
                )}

                {/* Hover Card for Collapsed State */}
                {isCollapsed && hoveredItem === tab.id && (
                  <SidebarHoverCard
                    trigger={<span className="sr-only">{tab.name}</span>}
                    content={
                      <div className="flex flex-col gap-2">
                        <p className="font-medium">{tab.name}</p>
                        <p className="text-xs text-neutral-400">{tab.description}</p>
                      </div>
                    }
                  />
                )}

                {/* Hover Glow Effect */}
                <div 
                  className={cn(
                    "absolute inset-0 opacity-0 transition-opacity duration-300",
                    "bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5",
                    "group-hover:opacity-100"
                  )}
                  style={{ filter: "blur(20px)" }}
                />

                {/* Active Indicator */}
                {tab.isActive && (
                  <div className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-custom-green" />
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

// Sidebar Footer Component
export function SidebarFooter() {
  const { isCollapsed } = useSidebar();
  const [currentTier, setCurrentTier] = React.useState<SubscriptionTier>('BASIC');

  // Fetch subscription data
  React.useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch('/api/stripe/billing');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setCurrentTier(data.currentTier);
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      }
    };

    fetchSubscriptionData();
  }, []);

  return (
    <div className={cn(
      "flex flex-col items-start space-y-4 p-4",
      isCollapsed ? "items-center justify-center" : "space-y-4"
    )}>
      {/* Dynamic Upgrade CTA */}
      {!isCollapsed && (
        <UpgradeCTA 
          currentTier={currentTier} 
          isCollapsed={isCollapsed} 
        />
      )}

      {/* Profile Component */}
      <SidebarAccount isCollapsed={isCollapsed} />

      {/* Social Media Icons */}
      {!isCollapsed && (
        <div className="flex space-x-3 mt-2">
          <Link href="https://facebook.com" target="_blank" aria-label="Facebook">
            <FaFacebook className="h-5 w-5 text-neutral-400 hover:text-white transition-colors" />
          </Link>
          <Link href="https://twitter.com" target="_blank" aria-label="Twitter">
            <FaTwitter className="h-5 w-5 text-neutral-400 hover:text-white transition-colors" />
          </Link>
          <Link href="https://linkedin.com" target="_blank" aria-label="LinkedIn">
            <FaLinkedin className="h-5 w-5 text-neutral-400 hover:text-white transition-colors" />
          </Link>
        </div>
      )}
    </div>
  );
}

export * from "@/components/sidebar/hover-card";
export * from "@/components/sidebar/search";
export * from "@/components/sidebar/account";
export * from "@/components/sidebar/group-label";
