// components/parts/breadcrumbs.tsx

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Icon from "@/public/icon.svg";

export const Breadcrumbs = ({
  pageName,
  isLoading,
}: {
  pageName?: string;
  isLoading?: boolean;
}) => {
  return (
    <Breadcrumb
      className="relative h-[67.63px] flex items-center justify-between p-6 rounded-xl border border-white/[0.02] bg-neutral-900/80 backdrop-blur-md shadow-dream shine overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
        {/* Gradient Overlay to Fade Grid */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
      </div>

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

      <Image
        className="relative z-10 transition-all duration-500 hover:scale-110 hover:brightness-125"
        src={Icon}
        width={24}
        height={24}
        alt="Router.so Icon"
      />
    </Breadcrumb>
  );
};
