// components/groups/sites/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { SelectSite } from "@/lib/schema";
import Link from "next/link";
import { format } from "date-fns";
import { Globe, ExternalLink } from "lucide-react";

// Dream UI styled badge
const DreamBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-light bg-neutral-900/50 text-neutral-300 border border-white/[0.08] backdrop-blur-md shine">
    {children}
  </div>
);

// Dream UI styled link
const DreamLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className="
      inline-flex items-center gap-1.5
      text-dream-cyan hover:text-dream-purple
      transition-colors duration-300
      group
    "
  >
    <span className="border-b border-dream-cyan/20 group-hover:border-dream-purple/20 transition-colors duration-300">
      {children}
    </span>
    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
  </Link>
);

// Define the columns for the SitesDataTable
export const columns: ColumnDef<SelectSite>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const site = row.original;
      return (
        <DreamLink href={`/sites/${site.id}`}>
          {site.name}
        </DreamLink>
      );
    },
  },
  {
    accessorKey: "subdomain",
    header: "Subdomain",
    cell: ({ row }) => {
      const subdomain = row.original.subdomain;
      return (
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-neutral-500" />
          <DreamBadge>{subdomain}</DreamBadge>
        </div>
      );
    },
  },
  {
    accessorKey: "customDomain",
    header: "Custom Domain",
    cell: ({ row }) => {
      const domain = row.original.customDomain;
      return domain ? (
        <DreamBadge>{domain}</DreamBadge>
      ) : (
        <span className="text-xs text-neutral-500">Not set</span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      return (
        <span className="text-sm text-neutral-400 font-mono">
          {format(new Date(createdAt), "MMM dd, yyyy")}
        </span>
      );
    },
  },
];