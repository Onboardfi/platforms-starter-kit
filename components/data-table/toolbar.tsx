// components/data-table/toolbar.tsx

"use client";

import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const router = useRouter();

  const handleCreateAgent = () => {
    router.push("/agents/create");
  };

  return (
    <div className="flex items-center justify-between">
      <Input
        placeholder="Search agents..."
        value={(table.getState().globalFilter as string) ?? ""}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
        className="max-w-sm"
      />
      <Button onClick={handleCreateAgent}>
        <Plus className="mr-2 h-4 w-4" />
        Create Agent
      </Button>
    </div>
  );
}
