// components/groups/sites/columns.tsx

import { ColumnDef } from "@tanstack/react-table";
import { SelectSite } from "@/lib/schema";
import Link from "next/link";
import { format } from "date-fns";

// Define the columns for the SitesDataTable
export const columns: ColumnDef<SelectSite>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const site = row.original;
      return (
        <Link href={`/sites/${site.id}`} className="text-blue-500 hover:underline">
          {site.name}
        </Link>
      );
    },
  },
  {
    accessorKey: "subdomain",
    header: "Subdomain",
  },
  {
    accessorKey: "customDomain",
    header: "Custom Domain",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      return format(new Date(createdAt), "MMM dd, yyyy");
    },
  },
  // Add more columns as needed
];
