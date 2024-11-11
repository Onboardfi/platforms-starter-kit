'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { Database, Layout, Puzzle, ArrowRight } from "lucide-react";

const navLinks = [
  {
    name: "Storage",
    description: "Manage your data ",
    href: "/agents",
    icon: Database
  },
  {
    name: "Sites",
    description: "Create and manage your sites",
    href: "/sites",
    icon: Layout
  },
  {
    name: "Integrations",
    description: "Create and manage your integrations",
    href: "/integrations",
    icon: Puzzle
  }
];

export function Links() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {navLinks.map((link, index) => {
        const Icon = link.icon;
        
        return (
          <motion.div
            key={link.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5,
              delay: index * 0.1,
              ease: [0.2, 0.8, 0.2, 1]
            }}
          >
            <Link href={link.href} className="block relative group overflow-hidden">
              <div 
                className="relative group overflow-hidden 
                  border border-white/[0.02] rounded-xl
                  bg-neutral-900/50 backdrop-blur-md
                  transition-all duration-500
                  shine shadow-dream"
              >
                {/* Animated gradient background */}
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ filter: "blur(40px)" }}
                />

                <div className="relative p-6 space-y-4">
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-lg bg-white/[0.05] border border-white/[0.05]
                    flex items-center justify-center group-hover:border-white/[0.1] 
                    transition-colors duration-500">
                    <Icon className="w-5 h-5 text-white/60 group-hover:text-white/90 
                      transition-colors duration-500" />
                  </div>

                  {/* Content */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white group-hover:text-glow 
                        transition-all duration-300">
                        {link.name}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 
                        transform group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <p className="text-sm text-neutral-400 group-hover:text-neutral-300 
                      transition-colors duration-300">
                      {link.description}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}